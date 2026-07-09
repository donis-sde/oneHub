export interface Paginator {
  skip: number;
  limit: number;
}

export interface Paginated<R> {
  data: R[];
  paginator: Paginator;
  hasNext?: boolean;
  count: number;
}
