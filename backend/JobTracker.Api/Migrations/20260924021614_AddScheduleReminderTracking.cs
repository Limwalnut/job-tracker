using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduleReminderTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReminderSentAtUtc",
                table: "ApplicationEvents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationEvents_Status_ReminderSentAtUtc_StartsAt",
                table: "ApplicationEvents",
                columns: new[] { "Status", "ReminderSentAtUtc", "StartsAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ApplicationEvents_Status_ReminderSentAtUtc_StartsAt",
                table: "ApplicationEvents");

            migrationBuilder.DropColumn(
                name: "ReminderSentAtUtc",
                table: "ApplicationEvents");
        }
    }
}
