/* eslint-disable */
// @ts-nocheck
import { MongoClient, FindOptions, ObjectId } from 'mongodb';
import { DateTime, Duration } from 'luxon';
import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { getEnv } from '@/utils/getEnv';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

// Define your RBAC rules
const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.GET,
  },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.FRT_REPORT,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await rbacMiddleware(req, res, async () => {
      const DB_URL = process.env.DB_URL;
      const MT_DB_NAME = process.env.MT_DB_NAME;
      const MT_USER_COLLECTION_NAME = process.env.MT_USER_COLLECTION_NAME;
      const MT_SETTING_COLLECTION_NAME = process.env.MT_SETTING_COLLECTION_NAME;
      const { startDate, endDate, tenantId } = req.query;
      const start_date_str = startDate;
      const end_date_str = endDate;
      const tenant_id = tenantId;

      if (!start_date_str || !end_date_str || !tenant_id) {
        return res.status(400).json({ error: 'Missing required headers' });
      }
      const connection_string = DB_URL;
      const client = new MongoClient(connection_string);
      const db_name = MT_DB_NAME;
      const db = client.db(db_name);
      const user_collection = db.collection(MT_USER_COLLECTION_NAME);
      const settings_collection = db.collection(MT_SETTING_COLLECTION_NAME);
      const settingsDocument = await settings_collection.findOne({
        TenantId: tenant_id,
      });

      const settings = settingsDocument || {
        GeneralSetting: { CustomerTimeZone: '' },
      };
      const time_zone_diff_minutes = get_time_zone_diff_minutes(
        settings.GeneralSetting.CustomerTimeZone,
      );

      function get_time_zone_diff_minutes(customer_time_zone: string): number {
        let diff_minutes = 8 * 60;
        if (customer_time_zone) {
          let hours_and_minutes: string[] | undefined = undefined;
          if (customer_time_zone.includes(':')) {
            hours_and_minutes = customer_time_zone.split(':');
            if (hours_and_minutes.length === 2) {
              const sign = customer_time_zone.startsWith('+') ? 1 : -1;
              const diff_hours = hours_and_minutes[0]
                .replace(/[-+]/g, '')
                .match(/^\d+$/)
                ? parseInt(hours_and_minutes[0])
                : 0;
              const diff_min = hours_and_minutes[1].match(/^\d+$/)
                ? parseInt(hours_and_minutes[1])
                : 0;
              diff_minutes = (diff_hours * 60 + diff_min) * sign;
            }
          } else {
            const sign = customer_time_zone.startsWith('+') ? 1 : -1;
            const diff_hours = customer_time_zone
              .replace(/[-+]/g, '')
              .match(/^\d+$/)
              ? parseInt(customer_time_zone)
              : 0;
            diff_minutes = diff_hours * 60 * sign;
          }
        }
        return diff_minutes;
      }

      function convert_string_to_datetime(string: string): DateTime {
        return DateTime.fromFormat(string, 'yyyy-MM-dd');
      }

      const start_date_utc = convert_string_to_datetime(start_date_str);

      const end_date_utc = convert_string_to_datetime(end_date_str);
      const start_date = start_date_utc.minus(
        Duration.fromObject({ minutes: time_zone_diff_minutes }),
      );
      const end_date = end_date_utc.minus(
        Duration.fromObject({ minutes: time_zone_diff_minutes }),
      );

      async function get_assigning_and_expired_events_for_frt(
        from_date: DateTime,
        to_date: DateTime,
        ticket_ids: string[],
      ): Promise<any[]> {
        const ticketIdsAsObjectIds = ticket_ids.map((id) => new ObjectId(id));
        const start_Date = from_date.minus(Duration.fromObject({ days: 1 }));
        const startDdate = new Date(start_Date);
        const endDate = new Date(to_date);
        const filter_query = {
          TenantId: tenant_id,
          Created: {
            $gte: startDdate,
            $lte: endDate,
          },
          Type: { $in: [1, 4] },
          TicketId: { $in: ticketIdsAsObjectIds },
          _t: { $elemMatch: { $eq: 'TicketEvent' } },
        };
        const cursor = db.collection('ConversationEvent').find(filter_query);
        const result = await cursor.toArray();
        return result;
      }

      async function get_last_assigned_ticket_ids_by_agent_ids(
        from_date: DateTime,
        to_date: DateTime,
        user_ids: string[],
        conversation_ids: string[],
      ): Promise<Record<string, string[]>> {
        const filter_query = {
          TenantId: tenant_id,
          LastUpdated: { $gte: from_date, $lte: to_date },
          LastAssignedAgentId: { $in: user_ids },
          ConversationId: { $in: conversation_ids },
        };
        const pipeline = [
          { $match: filter_query },
          {
            $group: {
              _id: '$LastAssignedAgentId',
              TicketIds: { $push: '$_id' },
            },
          },
        ];
        const cursor = db.collection('ConversationTicket').aggregate(pipeline);
        const result = await cursor.toArray();
        return result.reduce((acc, item) => {
          acc[item._id] = item.TicketIds;
          return acc;
        }, {});
      }

      async function get_first_responses_by_ticket_ids_by_user_ids(
        user_ids: string[],
        ticket_ids: string[],
      ): Promise<Record<string, Record<string, any>>> {
        const ticketIdsAsObjectIds = ticket_ids.map((id) => new ObjectId(id));
        const userIdsAsObjectIds = user_ids.map((id) => new ObjectId(id));
        const filter_query = {
          TenantId: tenant_id,
          _t: { $elemMatch: { $eq: 'Message' } },
          IsOwner: true,
          AssignedId: { $in: userIdsAsObjectIds },
          TicketId: { $in: ticketIdsAsObjectIds },
        };
        const sort_definition = { Created: 1 };
        const group_stage = {
          _id: {
            AssignedId: '$AssignedId',
            TicketId: '$TicketId',
          },
          FirstResponse: { $first: '$$ROOT' },
        };
        const group_by_assigned_id = {
          _id: '$_id.AssignedId',
          FirstResponsesByTicketIds: {
            $push: {
              TicketId: '$_id.TicketId',
              FirstResponse: '$FirstResponse',
            },
          },
        };
        const project_stage = {
          _id: 0,
          AssignedId: '$_id',
          FirstResponsesByTicketIds: 1,
        };
        const result = await db
          .collection('ConversationEvent')
          .aggregate([
            { $match: filter_query },
            { $sort: sort_definition },
            { $group: group_stage },
            { $group: group_by_assigned_id },
            { $project: project_stage },
          ])
          .toArray();
        const response_dict: Record<string, Record<string, any>> = {};
        for (const item of result) {
          const assigned_id = item.AssignedId.toString();
          const ticket_responses: Record<string, any> = {};
          for (const ticket_response of item.FirstResponsesByTicketIds) {
            const ticket_id = ticket_response.TicketId.toString();
            const message = ticket_response.FirstResponse;
            message._id = message._id.toString();
            ticket_responses[ticket_id] = message;
          }
          response_dict[assigned_id] = ticket_responses;
        }
        return response_dict;
      }

      function calculate_frt_for_operator(
        user_assigning_events: any[],
        user_expired_events: any[],
        user_first_responses_by_tickets: Record<string, any>,
      ): number {
        let first_response_time = 0;
        const tickets_without_user_response: string[] = [];
        let first_responses_count = 0;
        const user_ticket_ids = Array.from(
          new Set(user_assigning_events.map((event) => event.TicketId)),
        );

        for (const user_ticket_id of user_ticket_ids) {
          const ticket_assigning_events = user_assigning_events.filter(
            (event) => event.TicketId === user_ticket_id,
          );
          const current_ticket_first_user_response =
            user_first_responses_by_tickets[user_ticket_id.toString()];

          if (!current_ticket_first_user_response) {
            tickets_without_user_response.push(user_ticket_id.toString());
            continue;
          }

          const assigning_events_before_first_response =
            ticket_assigning_events.filter(
              (event) =>
                event.Created <= current_ticket_first_user_response.Created,
            );

          if (assigning_events_before_first_response.length === 1) {
            first_responses_count += 1;
            first_response_time +=
              current_ticket_first_user_response.Created -
              assigning_events_before_first_response[0].Created;
          }
        }

        for (const ticket_without_user_response of tickets_without_user_response) {
          const ticket_expired_event = user_expired_events.find(
            (event) => event.TicketId === ticket_without_user_response,
          );

          if (ticket_expired_event) {
            const last_assigning_event = user_assigning_events
              .filter(
                (event) => event.TicketId === ticket_without_user_response,
              )
              .reduce((min_event, event) =>
                event.Created < min_event.Created ? event : min_event,
              );
            first_responses_count += 1;
            first_response_time += ticket_expired_event.Created.diff(
              last_assigning_event.Created,
            ).milliseconds;
          }
        }

        if (first_responses_count !== 0) {
          const avg_first_response_time =
            first_response_time / first_responses_count;
          return avg_first_response_time / 1000;
        }

        return 0;
      }

      async function calculate_metrics_for_operators(): Promise<any[]> {
        const filter_query = {
          Roles: { $in: ['OPERATOR'] },
          IsBot: false,
          TenantId: tenant_id,
        };
        const projection = {
          _id: 1,
          FirstName: 1,
          LastName: 1,
          Email: 1,
        };
        const projections: FindOptions<Document> = {
          projection: projection,
        };
        const operators = await user_collection
          .find(filter_query, projections)
          .toArray();
        const operator_metrics_list = [];
        let current_date = start_date;
        while (current_date <= end_date) {
          const metrics_for_current_date: {
            Date: DateTime;
            OperatorsData: {
              Id: ObjectId;
              Name: string;
              Email: string;
              FRT: number;
            }[];
          } = {
            Date: current_date,
            OperatorsData: [],
          };
          const startDate = new Date(current_date);
          const end_date = current_date.plus(Duration.fromObject({ days: 1 }));
          const endDate = new Date(end_date);
          const conversation_ids = await db
            .collection('Conversation')
            .find(
              {
                TenantId: tenant_id,
                $or: [
                  {
                    StartedDate: { $lte: startDate },
                    LastUpdated: { $gt: startDate },
                  },
                  {
                    StartedDate: { $gte: startDate },
                    LastUpdated: {
                      $lt: endDate,
                    },
                  },
                ],
                IsBlocked: false,
              },
              { projection: { _id: 1 } },
            )
            .toArray();

          const ticket_filter = {
            TenantId: tenant_id,
            LastUpdated: {
              $gte: startDate,
              $lte: endDate,
            },
            ConversationId: {
              $in: conversation_ids.map((conv) => conv._id.toString()),
            },
          };

          const ticket_ids: string[] = await db
            .collection('ConversationTicket')
            .distinct('_id', ticket_filter)
            .then((ids) => ids.map((id) => id.toString()));

          const user_ids = operators.map((user) => user._id.toString());

          const assigning_expired_events =
            await get_assigning_and_expired_events_for_frt(
              current_date,
              current_date.plus(Duration.fromObject({ days: 1 })),
              ticket_ids,
            );
          const last_assigned_ticket_ids_by_agents =
            await get_last_assigned_ticket_ids_by_agent_ids(
              current_date,
              current_date.plus(Duration.fromObject({ days: 1 })),
              user_ids,
              conversation_ids.map((conv) => conv._id.toString()),
            );
          const first_responses_by_tickets_by_users =
            await get_first_responses_by_ticket_ids_by_user_ids(
              user_ids,
              ticket_ids,
            );
          for (const operator of operators) {
            const user_first_responses_by_tickets =
              first_responses_by_tickets_by_users[operator._id.toString()] ||
              {};

            const user_last_assigned_ticket_ids =
              last_assigned_ticket_ids_by_agents[operator._id.toString()] || [];
            const user_expired_events = assigning_expired_events.filter(
              (event) =>
                event.Type === 4 &&
                user_last_assigned_ticket_ids.includes(event.TicketId) &&
                event.Created >= current_date,
            );
            const user_assigning_events = assigning_expired_events.filter(
              (event) => event.Type === 1 && event.Assignee === operator.Email,
            );
            const frt = calculate_frt_for_operator(
              user_assigning_events,
              user_expired_events,
              user_first_responses_by_tickets,
            );

            const operator_data = {
              Id: operator._id,
              Name: `${operator.FirstName} ${operator.LastName}`,
              Email: operator.Email,
              FRT: frt,
            };
            metrics_for_current_date.OperatorsData.push(operator_data);
          }

          operator_metrics_list.push(metrics_for_current_date);
          current_date = current_date.plus(Duration.fromObject({ days: 1 }));
        }

        return operator_metrics_list;
      }

      const operator_metrics = await calculate_metrics_for_operators();

      function format_date(date: DateTime): string {
        return date.toFormat('dd-LLL-yyyy');
      }

      function format_frt(seconds: number): string {
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remaining_seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${remaining_seconds}s`;
      }

      const file_name = 'operator_metrics.csv';
      const header = ['Date', 'Name', 'Email', 'FRT'];

      const rows: any[] = [];

      for (const metrics_for_date of operator_metrics) {
        for (const operator_data of metrics_for_date.OperatorsData) {
          const frt: number = operator_data.FRT;
          if (frt !== 0) {
            const formattedDate: string = format_date(
              metrics_for_date.Date.plus(
                Duration.fromObject({ minutes: time_zone_diff_minutes }),
              ),
            );

            const row = {
              Date: formattedDate,
              Name: operator_data.Name,
              Email: operator_data.Email,
              FRT: format_frt(frt),
            };

            rows.push(row);
          }
        }
      }

      console.log('All rows added to the array successfully.');
      console.log('CSV report is generated successfully.');

      res.status(200).json({ generatedData: rows });
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
