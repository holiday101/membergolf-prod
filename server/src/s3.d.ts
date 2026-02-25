import { S3Client } from "@aws-sdk/client-s3";
export declare const s3: S3Client;
export declare function presignPut(key: string, contentType?: string | null): Promise<string>;
export declare function presignGet(key: string): Promise<string>;
export declare function deleteObject(key: string): Promise<void>;
//# sourceMappingURL=s3.d.ts.map