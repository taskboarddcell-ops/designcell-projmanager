#!/bin/bash
# Fix assign task button event delegation and user deletion

# Create the replacement code for event delegation
cat > /tmp/event_fix.txt << 'EOF'
      // Add event delegation for sub-assign buttons  
      const stagesBox = el('stagesBox');
      if (stagesBox) {
        // Remove old listener if exists
        if ((stagesBox as any)._assignClickHandler) {
          stagesBox.removeEventListener('click', (stagesBox as any)._assignClickHandler);
        }
        
        const clickHandler = async (ev: Event) => {
          const target = ev.target as HTMLElement;
          console.log('[DEBUG] Click on:', target?.className, 'is sub-assign:', target?.classList.contains('sub-assign'));
          
          if (!target || !target.classList.contains('sub-assign')) return;
          
          ev.stopPropagation();
          const stageName = target.getAttribute('data-stage') || '';
          const subName = target.getAttribute('data-sub') || '';
          const taskId = target.getAttribute('data-task-id') || '';
          
          console.log('[DEBUG] Opening modal for:', stageName, subName, taskId);
          await openSubstageAssign(stageName, subName, taskId);
        };
        
        (stagesBox as any)._assignClickHandler = clickHandler;
        stagesBox.addEventListener('click', clickHandler);
        console.log('[DEBUG] Event listener attached');
      }
    }
EOF

# Use awk to replace lines 3809-3829
awk 'NR<3809 || NR>3829' app/ProjectManagerClient.tsx > /tmp/part1.txt
awk 'NR>=3830' app/ProjectManagerClient.tsx > /tmp/part2.txt

cat /tmp/part1.txt /tmp/event_fix.txt /tmp/part2.txt > app/ProjectManagerClient.tsx

echo "Event delegation fixed"
