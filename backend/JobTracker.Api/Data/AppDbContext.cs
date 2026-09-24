using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;

namespace JobTracker.Api.Data;

public class AppDbContext :
    IdentityDbContext<ApplicationUser>,
    IDataProtectionKeyContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<DataProtectionKey> DataProtectionKeys { get; set; } = null!;

    public DbSet<JobApplication> Applications { get; set; }

    public DbSet<ApplicationEvent> ApplicationEvents { get; set; }

    public DbSet<ApplicationStatusHistory> ApplicationStatusHistories { get; set; }

    public DbSet<ApplicationChecklistItem> ApplicationChecklistItems { get; set; }

    public DbSet<AdminAuditLog> AdminAuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApplicationUser>()
            .Property(user => user.DisplayName)
            .HasMaxLength(80);

        modelBuilder.Entity<ApplicationUser>()
            .Property(user => user.CreatedAtUtc)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<ApplicationUser>()
            .HasIndex(user => user.CreatedAtUtc);

        modelBuilder.Entity<ApplicationUser>()
            .HasIndex(user => user.LastSeenAtUtc);

        var auditLogEntity = modelBuilder.Entity<AdminAuditLog>();

        auditLogEntity.Property(log => log.AdminUserId).HasMaxLength(450);
        auditLogEntity.Property(log => log.TargetUserId).HasMaxLength(450);
        auditLogEntity.Property(log => log.Action).HasMaxLength(100);
        auditLogEntity.Property(log => log.Detail).HasMaxLength(1000);
        auditLogEntity.HasIndex(log => log.CreatedAtUtc);
        auditLogEntity.HasIndex(log => log.TargetUserId);

        modelBuilder.Entity<JobApplication>()
            .Property(application => application.Status)
            .HasConversion<string>();

        modelBuilder.Entity<JobApplication>()
            .Property(application => application.JobDescription)
            .HasMaxLength(20000);

        modelBuilder.Entity<JobApplication>()
            .Property(application => application.JobDescriptionUrl)
            .HasMaxLength(2000);

        modelBuilder.Entity<JobApplication>()
            .Property(application => application.ContactName)
            .HasMaxLength(200);

        modelBuilder.Entity<JobApplication>()
            .Property(application => application.ContactPhone)
            .HasMaxLength(50);

        modelBuilder.Entity<JobApplication>()
            .Property(application => application.ContactEmail)
            .HasMaxLength(320);

        modelBuilder.Entity<JobApplication>()
            .HasOne(application => application.User)
            .WithMany()
            .HasForeignKey(application => application.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<JobApplication>()
            .HasIndex(application => application.UserId);

        var eventEntity = modelBuilder.Entity<ApplicationEvent>();

        eventEntity.Property(applicationEvent => applicationEvent.Type)
            .HasConversion<string>();

        eventEntity.Property(applicationEvent => applicationEvent.Status)
            .HasConversion<string>();

        eventEntity.Property(applicationEvent => applicationEvent.InterviewOutcome)
            .HasConversion<string>();

        eventEntity.Property(applicationEvent => applicationEvent.Title)
            .HasMaxLength(200);

        eventEntity.Property(applicationEvent => applicationEvent.TimeZone)
            .HasMaxLength(100);

        eventEntity.Property(applicationEvent => applicationEvent.LocationOrLink)
            .HasMaxLength(2000);

        eventEntity.Property(applicationEvent => applicationEvent.Notes)
            .HasMaxLength(4000);

        eventEntity.Property(applicationEvent => applicationEvent.InterviewStage)
            .HasMaxLength(100);

        eventEntity.HasOne(applicationEvent => applicationEvent.Application)
            .WithMany()
            .HasForeignKey(applicationEvent => applicationEvent.ApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        eventEntity.HasIndex(applicationEvent => applicationEvent.ApplicationId);

        eventEntity.HasIndex(applicationEvent => applicationEvent.StartsAt);

        eventEntity.HasIndex(applicationEvent => new
        {
            applicationEvent.Status,
            applicationEvent.ReminderSentAtUtc,
            applicationEvent.StartsAt
        });

        var checklistItemEntity = modelBuilder.Entity<ApplicationChecklistItem>();

        checklistItemEntity.Property(item => item.Title).HasMaxLength(200);
        checklistItemEntity.Property(item => item.Stage).HasMaxLength(100);
        checklistItemEntity.HasOne(item => item.Application)
            .WithMany()
            .HasForeignKey(item => item.ApplicationId)
            .OnDelete(DeleteBehavior.Cascade);
        checklistItemEntity.HasIndex(item => item.ApplicationId);
        checklistItemEntity.HasIndex(item => new { item.ApplicationId, item.IsCompleted, item.DueDate });

        var statusHistoryEntity = modelBuilder.Entity<ApplicationStatusHistory>();

        statusHistoryEntity.Property(history => history.FromStatus)
            .HasConversion<string>();

        statusHistoryEntity.Property(history => history.ToStatus)
            .HasConversion<string>();

        statusHistoryEntity.Property(history => history.Source)
            .HasConversion<string>();

        statusHistoryEntity.HasOne(history => history.Application)
            .WithMany()
            .HasForeignKey(history => history.ApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        statusHistoryEntity.HasOne(history => history.ApplicationEvent)
            .WithMany(applicationEvent => applicationEvent.StatusChanges)
            .HasForeignKey(history => history.ApplicationEventId)
            .OnDelete(DeleteBehavior.SetNull);

        statusHistoryEntity.HasIndex(history => new
        {
            history.ApplicationId,
            history.ChangedAt
        });

        statusHistoryEntity.HasIndex(history => history.ApplicationEventId);
    }
}
