using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<JobApplication> Applications { get; set; }

    public DbSet<ApplicationEvent> ApplicationEvents { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<JobApplication>()
            .Property(application => application.Status)
            .HasConversion<string>();

        var eventEntity = modelBuilder.Entity<ApplicationEvent>();

        eventEntity.Property(applicationEvent => applicationEvent.Type)
            .HasConversion<string>();

        eventEntity.Property(applicationEvent => applicationEvent.Status)
            .HasConversion<string>();

        eventEntity.Property(applicationEvent => applicationEvent.Title)
            .HasMaxLength(200);

        eventEntity.Property(applicationEvent => applicationEvent.TimeZone)
            .HasMaxLength(100);

        eventEntity.Property(applicationEvent => applicationEvent.LocationOrLink)
            .HasMaxLength(2000);

        eventEntity.Property(applicationEvent => applicationEvent.Notes)
            .HasMaxLength(4000);

        eventEntity.HasOne(applicationEvent => applicationEvent.Application)
            .WithMany()
            .HasForeignKey(applicationEvent => applicationEvent.ApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        eventEntity.HasIndex(applicationEvent => applicationEvent.ApplicationId);

        eventEntity.HasIndex(applicationEvent => applicationEvent.StartsAt);
    }
}