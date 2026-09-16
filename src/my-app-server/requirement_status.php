<?php
declare(strict_types=1);

// Shared by bootstrap.php (web requests) and lifecycle_worker.php (CLI), which
// cannot load bootstrap.php because it starts a session and sends headers.

/**
 * Materializes requirement statuses for one club.
 *  - event/activity follow their time window;
 *  - a fee is completed only once it has been billed and every live charge is paid;
 *  - 'canceled' is a manual decision and is never overwritten.
 * Returns the number of rows actually changed.
 */
function refresh_requirement_statuses(PDO $pdo, int $clubId): int
{
    $timeBased = $pdo->prepare(
        "UPDATE requirements
            SET status = CASE
                WHEN start_datetime > NOW() THEN 'scheduled'
                WHEN end_datetime < NOW() THEN 'completed'
                ELSE 'ongoing'
            END
          WHERE club_id = :club_id
            AND requirement_type IN ('event', 'activity')
            AND status IN ('scheduled', 'ongoing')"
    );
    $timeBased->execute([':club_id' => $clubId]);
    $changed = $timeBased->rowCount();

    // Payment drives fee completion; the window only separates scheduled from ongoing.
    // "Everyone paid" means every assigned payer, and falls back to everyone actually
    // billed only when the fee has no assignees, since that is the only signal then.
    $fees = $pdo->prepare(
        "UPDATE requirements r
            SET status = CASE
                WHEN (
                    CASE
                        WHEN EXISTS (SELECT 1 FROM event_registrations e
                                      WHERE e.requirement_id = r.requirement_id AND e.status = 'registered')
                        THEN NOT EXISTS (
                            SELECT 1 FROM event_registrations e
                             WHERE e.requirement_id = r.requirement_id AND e.status = 'registered'
                               AND NOT EXISTS (
                                   SELECT 1 FROM transactions t
                                    WHERE t.requirement_id = r.requirement_id AND t.user_id = e.user_id
                                      AND t.is_voided = 0 AND t.payment_status = 'paid'
                               )
                        )
                        ELSE EXISTS (SELECT 1 FROM transactions t
                                      WHERE t.requirement_id = r.requirement_id AND t.is_voided = 0)
                         AND NOT EXISTS (SELECT 1 FROM transactions t
                                      WHERE t.requirement_id = r.requirement_id
                                        AND t.is_voided = 0 AND t.payment_status <> 'paid')
                    END
                )
                THEN 'completed'
                WHEN r.start_datetime > NOW() THEN 'scheduled'
                ELSE 'ongoing'
            END
          WHERE r.club_id = :club_id
            AND r.requirement_type = 'fee'
            AND r.status <> 'canceled'"
    );
    $fees->execute([':club_id' => $clubId]);
    $changed += $fees->rowCount();

    return $changed;
}
