import os
import re

files = [
    "frontend/src/app/admin/all-requests/page.tsx",
    "frontend/src/app/admin/concierge/page.tsx",
    "frontend/src/app/admin/facility/page.tsx",
    "frontend/src/app/admin/fb/page.tsx",
    "frontend/src/app/admin/housekeeping/page.tsx"
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to replace the conflict block.
    # The conflict block looks like:
    # <<<<<<< HEAD
    #                 <TaskTicket 
    #                   key={req.id}
    #                   ... (HEAD props)
    #                 />
    # =======
    #                 <div key={req.id} onClick={() => setDetailTarget(req.id)} style={{ cursor: 'pointer' }}>
    #                   <TaskTicket 
    #                     ... (dev props)
    #                   />
    #                 </div>
    # >>>>>>> origin/dev
    
    pattern = re.compile(
        r'<<<<<<< HEAD\n(.*?<TaskTicket\s+)(key=\{req\.id\}\s+)?(.*?\/>)\n=======\n.*?<div key=\{req\.id\} onClick=\{\(\) => setDetailTarget\(req\.id\)\} style=\{\{ cursor: \'pointer\' \}\}>\n.*?<\/div>\n>>>>>>> origin/dev',
        re.DOTALL
    )
    
    def replacer(match):
        start_tag = match.group(1)
        rest_of_ticket = match.group(3)
        
        return f"""                <div key={{req.id}} onClick={{() => setDetailTarget(req.id)}} style={{{{ cursor: 'pointer' }}}}>
{start_tag}{rest_of_ticket}
                </div>"""
                
    new_content = pattern.sub(replacer, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Resolved {filepath}")
