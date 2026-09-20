using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTimelineCorrectionsAndEventLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ApplicationEventId",
                table: "ApplicationStatusHistories",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsReverted",
                table: "ApplicationStatusHistories",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RevertedAt",
                table: "ApplicationStatusHistories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationStatusHistories_ApplicationEventId",
                table: "ApplicationStatusHistories",
                column: "ApplicationEventId");

            migrationBuilder.AddForeignKey(
                name: "FK_ApplicationStatusHistories_ApplicationEvents_ApplicationEve~",
                table: "ApplicationStatusHistories",
                column: "ApplicationEventId",
                principalTable: "ApplicationEvents",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ApplicationStatusHistories_ApplicationEvents_ApplicationEve~",
                table: "ApplicationStatusHistories");

            migrationBuilder.DropIndex(
                name: "IX_ApplicationStatusHistories_ApplicationEventId",
                table: "ApplicationStatusHistories");

            migrationBuilder.DropColumn(
                name: "ApplicationEventId",
                table: "ApplicationStatusHistories");

            migrationBuilder.DropColumn(
                name: "IsReverted",
                table: "ApplicationStatusHistories");

            migrationBuilder.DropColumn(
                name: "RevertedAt",
                table: "ApplicationStatusHistories");
        }
    }
}
