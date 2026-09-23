using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInterviewRounds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InterviewOutcome",
                table: "ApplicationEvents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InterviewRound",
                table: "ApplicationEvents",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InterviewStage",
                table: "ApplicationEvents",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.Sql(
                """
                WITH ranked_interviews AS (
                    SELECT "Id",
                           ROW_NUMBER() OVER (
                               PARTITION BY "ApplicationId"
                               ORDER BY "StartsAt", "Id")::integer AS "Round"
                    FROM "ApplicationEvents"
                    WHERE "Type" = 'Interview'
                )
                UPDATE "ApplicationEvents" AS application_event
                SET "InterviewRound" = ranked_interviews."Round",
                    "InterviewOutcome" = 'Pending'
                FROM ranked_interviews
                WHERE application_event."Id" = ranked_interviews."Id";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InterviewOutcome",
                table: "ApplicationEvents");

            migrationBuilder.DropColumn(
                name: "InterviewRound",
                table: "ApplicationEvents");

            migrationBuilder.DropColumn(
                name: "InterviewStage",
                table: "ApplicationEvents");
        }
    }
}
