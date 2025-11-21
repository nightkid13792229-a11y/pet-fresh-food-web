# Database Backup Strategy

## Objectives

- Protect customer, recipe, and order data from accidental loss.
- Enable rapid recovery from server corruption or human errors.
- Keep an audit trail of backups for compliance.

## Recommended Approach

1. **Daily Full Backup**
   - Use `mysqldump` to export the entire `petfresh` database.
   - Run at off-peak hours (e.g., 02:00 local time).
   - Command example:
     ```bash
     mysqldump -u petfresh_app -p --single-transaction --quick petfresh > /backups/petfresh-$(date +%F).sql
     ```

2. **Retention Policy**
   - Keep daily backups for 7 days.
   - Keep weekly backups for 4 weeks (retain every Sunday).
   - Archive monthly backups for 6 months.

3. **Automation**
   - Configure a cron job on the server:
     ```cron
     0 2 * * * /usr/bin/mysqldump -u petfresh_app -p'SECRET' petfresh > /backups/petfresh-$(date +\%F).sql
     ```
   - Rotate backups using a script that deletes files older than the retention period.

4. **Off-site Storage**
   - Sync backups to a secure OSS/S3 bucket using lifecycle policies.
   - Encrypt archives before upload (e.g., `openssl enc -aes-256-cbc`).

5. **Verification**
   - Perform monthly restore tests on a staging database to ensure backups are valid.
   - Document restore procedures in the runbook.

6. **Monitoring & Alerts**
   - Log backup job success/failure to syslog.
   - Configure alerts (email/Slack) on backup failure.

> Update this document when infrastructure changes (e.g., migrating to RDS snapshots or managed backup solutions).



