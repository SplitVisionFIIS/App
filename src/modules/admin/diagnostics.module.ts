import { Module } from '@nestjs/common';
import { DiagnosticsController } from './diagnostics.controller';
import { FeatureFlagsService } from '../../common/feature-flags.service';
import { TelemetryService } from '../../common/telemetry.service';

@Module({
  controllers: [DiagnosticsController],
  providers: [FeatureFlagsService, TelemetryService],
  exports: [FeatureFlagsService, TelemetryService],
})
export class DiagnosticsModule {}
