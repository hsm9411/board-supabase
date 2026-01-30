import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, route } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - start) / 1000;
          this.httpRequestsCounter.inc({
            method,
            route: route?.path || 'unknown',
            status: '2xx',
          });
          this.httpRequestDuration.observe({ method, route: route?.path || 'unknown' }, duration);
        },
        error: (error) => {
          const duration = (Date.now() - start) / 1000;
          this.httpRequestsCounter.inc({
            method,
            route: route?.path || 'unknown',
            status: error.status || '5xx',
          });
          this.httpRequestDuration.observe({ method, route: route?.path || 'unknown' }, duration);
        },
      }),
    );
  }
}
