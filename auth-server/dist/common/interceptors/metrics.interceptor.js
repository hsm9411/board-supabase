"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const prom_client_1 = require("prom-client");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
let MetricsInterceptor = class MetricsInterceptor {
    httpRequestsCounter;
    httpRequestDuration;
    constructor(httpRequestsCounter, httpRequestDuration) {
        this.httpRequestsCounter = httpRequestsCounter;
        this.httpRequestDuration = httpRequestDuration;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const { method, route } = request;
        const start = Date.now();
        return next.handle().pipe((0, operators_1.tap)({
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
        }));
    }
};
exports.MetricsInterceptor = MetricsInterceptor;
exports.MetricsInterceptor = MetricsInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, nestjs_prometheus_1.InjectMetric)('http_requests_total')),
    __param(1, (0, nestjs_prometheus_1.InjectMetric)('http_request_duration_seconds')),
    __metadata("design:paramtypes", [prom_client_1.Counter,
        prom_client_1.Histogram])
], MetricsInterceptor);
//# sourceMappingURL=metrics.interceptor.js.map