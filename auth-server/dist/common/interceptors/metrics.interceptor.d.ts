import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Counter, Histogram } from 'prom-client';
export declare class MetricsInterceptor implements NestInterceptor {
    private readonly httpRequestsCounter;
    private readonly httpRequestDuration;
    constructor(httpRequestsCounter: Counter<string>, httpRequestDuration: Histogram<string>);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
