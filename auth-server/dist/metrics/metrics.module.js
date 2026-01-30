"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
const metrics_interceptor_1 = require("../common/interceptors/metrics.interceptor");
let MetricsModule = class MetricsModule {
};
exports.MetricsModule = MetricsModule;
exports.MetricsModule = MetricsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            nestjs_prometheus_1.PrometheusModule.register({
                path: '/metrics',
                defaultMetrics: { enabled: true },
            }),
        ],
        providers: [
            (0, nestjs_prometheus_1.makeCounterProvider)({
                name: 'http_requests_total',
                help: 'Total number of HTTP requests',
                labelNames: ['method', 'route', 'status'],
            }),
            (0, nestjs_prometheus_1.makeHistogramProvider)({
                name: 'http_request_duration_seconds',
                help: 'HTTP request duration in seconds',
                labelNames: ['method', 'route'],
            }),
            metrics_interceptor_1.MetricsInterceptor,
        ],
        exports: [nestjs_prometheus_1.PrometheusModule, metrics_interceptor_1.MetricsInterceptor],
    })
], MetricsModule);
//# sourceMappingURL=metrics.module.js.map