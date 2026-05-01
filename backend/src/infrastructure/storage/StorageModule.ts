import { Global, Module } from '@nestjs/common'
import { MinioStorageService } from './MinioStorageService'
import { STORAGE_SERVICE } from './IStorageService'

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useClass: MinioStorageService,
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
