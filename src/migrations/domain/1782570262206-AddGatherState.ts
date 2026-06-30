import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGatherState1782570262206 implements MigrationInterface {
    name = 'AddGatherState1782570262206'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "gather_state" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "updated_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "correlation_id" uuid NOT NULL, "trigger_event" text NOT NULL, "gather_events_state" jsonb NOT NULL DEFAULT '{}', "metadata" jsonb, CONSTRAINT "PK_43f885d142b83ddd673cdc30a53" PRIMARY KEY ("id", "correlation_id"))`);
        await queryRunner.query(`ALTER TABLE "event_queue" ALTER COLUMN "correlation_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "event_queue" ALTER COLUMN "correlation_id" SET DEFAULT uuid_generate_v4()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event_queue" ALTER COLUMN "correlation_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "event_queue" ALTER COLUMN "correlation_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`DROP TABLE "gather_state"`);
    }

}
