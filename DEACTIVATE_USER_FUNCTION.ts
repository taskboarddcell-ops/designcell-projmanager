// SOFT DELETE (DEACTIVATE) USER IMPLEMENTATION
// Replace the deleteUser function in ProjectManagerClient.tsx with this

async function deactivateUser(userId: string, userName: string) {
    if (!isAdmin()) {
        toast('Only admins can deactivate users');
        return;
    }

    console.log('[DEACTIVATE-USER] Attempting to deactivate:', { userId, userName });

    try {
        // Get count of open tasks assigned to this user
        const { data: openTasks, error: taskError } = await supabase
            .from('tasks')
            .select('id, task, status, assignee_ids, assignees')
            .contains('assignee_ids', [userId])
            .not('status', 'eq', 'Complete');

        if (taskError) {
            console.error('[DEACTIVATE-USER] Error fetching tasks:', taskError);
            toast('Failed to check user tasks');
            return;
        }

        const openTaskCount = openTasks?.length || 0;

        let reassignAction = 'leave'; // 'leave', 'reassign', 'unassign'
        let reassignToUserId: string | null = null;

        // Show confirmation with task info
        const message = openTaskCount > 0
            ? `Deactivate user "${userName}" (${userId})?\\n\\n` +
            `This user has ${openTaskCount} open task(s) assigned.\\n\\n` +
            `What would you like to do with these tasks?\\n` +
            `• OK = Leave tasks assigned (will show as "deactivated")\\n` +
            `• Cancel = Don't deactivate`
            : `Deactivate user "${userName}" (${userId})?\\n\\n` +
            `This user has no open tasks.\\n\\n` +
            `Deactivated users cannot log in but remain in task history.`;

        const confirmed = confirm(message);
        if (!confirmed) return;

        // If there are open tasks, ask about reassignment
        if (openTaskCount > 0) {
            const wantReassign = confirm(
                `Do you want to reassign the ${openTaskCount} open task(s) to another user?\\n\\n` +
                `• OK = Choose a user to reassign tasks\\n` +
                `• Cancel = Leave tasks assigned to ${userName} (deactivated)`
            );

            if (wantReassign) {
                // Get active users for reassignment
                const { data: activeUsers } = await supabase
                    .from('users')
                    .select('staff_id, name')
                    .eq('status', 'active')
                    .neq('staff_id', userId)
                    .order('name', { ascending: true });

                if (activeUsers && activeUsers.length > 0) {
                    const userList = activeUsers
                        .map((u, idx) => `${idx + 1}. ${u.name} (${u.staff_id})`)
                        .join('\\n');

                    const choice = prompt(
                        `Select a user to reassign tasks to:\\n\\n${userList}\\n\\n` +
                        `Enter the number (1-${activeUsers.length}), or 0 to unassign:`
                    );

                    if (choice) {
                        const choiceNum = parseInt(choice);
                        if (choiceNum === 0) {
                            reassignAction = 'unassign';
                        } else if (choiceNum > 0 && choiceNum <= activeUsers.length) {
                            reassignAction = 'reassign';
                            reassignToUserId = activeUsers[choiceNum - 1].staff_id;
                        }
                    }
                }
            }
        }

        // Step 1: Handle task reassignment based on choice
        if (openTasks && openTasks.length > 0) {
            for (const task of openTasks) {
                if (reassignAction === 'reassign' && reassignToUserId) {
                    // Reassign to new user
                    const currentIds = (task.assignee_ids || []) as string[];
                    const newIds = currentIds.filter((id: string) => id !== userId);
                    newIds.push(reassignToUserId);

                    await supabase
                        .from('tasks')
                        .update({
                            assignee_ids: newIds,
                            assignees: newIds // Will be populated with names in next load
                        })
                        .eq('id', task.id);

                    // Log reassignment event
                    await supabase.from('task_events').insert({
                        task_id: task.id,
                        event_type: 'reassigned',
                        from_user_id: userId,
                        to_user_id: reassignToUserId,
                        performed_by: currentUser?.staff_id
                    });
                } else if (reassignAction === 'unassign') {
                    // Remove user from assignment
                    const currentIds = (task.assignee_ids || []) as string[];
                    const newIds = currentIds.filter((id: string) => id !== userId);

                    await supabase
                        .from('tasks')
                        .update({
                            assignee_ids: newIds,
                            assignees: newIds
                        })
                        .eq('id', task.id);

                    // Log unassignment event
                    await supabase.from('task_events').insert({
                        task_id: task.id,
                        event_type: 'unassigned',
                        from_user_id: userId,
                        to_user_id: null,
                        performed_by: currentUser?.staff_id
                    });
                }
                // If 'leave', we don't modify the task assignments
            }
        }

        // Step 2: Deactivate the user (soft delete)
        const { error: deactivateError } = await supabase
            .from('users')
            .update({ status: 'deactivated' })
            .eq('staff_id', userId);

        if (deactivateError) {
            console.error('[DEACTIVATE-USER] Error:', deactivateError);
            toast('Failed to deactivate user');
            return;
        }

        console.log('[DEACTIVATE-USER] Successfully deactivated user:', userId);

        const actionMsg = reassignAction === 'reassign'
            ? ` and reassigned ${openTaskCount} task(s)`
            : reassignAction === 'unassign'
                ? ` and unassigned ${openTaskCount} task(s)`
                : openTaskCount > 0
                    ? ` (${openTaskCount} task(s) remain assigned)`
                    : '';

        toast(`User deactivated${actionMsg}`);

        // Force fresh reload from database
        await loadAllUsers();
        await loadDataAfterLogin(); // Refresh tasks to reflect changes
    } catch (err) {
        console.error('[DEACTIVATE-USER] Exception:', err);
        toast(`Exception: ${err}`);
    }
}
