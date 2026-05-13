import re

filepath = "frontend/src/app/staff/page.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Block 1: Imports
# <<<<<<< HEAD
# import TaskDetailModal from './_components/TaskDetailModal/TaskDetailModal';
# 
# export default function StaffDashboard() {
# =======
# import Sidebar from '@/components/layout/Sidebar';
# import GlobalEmergencyListener from '@/components/GlobalEmergencyListener';
# import TaskDetailModal from './_components/TaskDetailModal/TaskDetailModal';
# 
# export default function StaffDashboard() {
# >>>>>>> origin/dev

content = re.sub(
    r'<<<<<<< HEAD\nimport TaskDetailModal from \'\./_components/TaskDetailModal/TaskDetailModal\';\n\nexport default function StaffDashboard\(\) \{\n=======\nimport Sidebar from \'@/components/layout/Sidebar\';\nimport GlobalEmergencyListener from \'@/components/GlobalEmergencyListener\';\nimport TaskDetailModal from \'\./_components/TaskDetailModal/TaskDetailModal\';\n\nexport default function StaffDashboard\(\) \{\n>>>>>>> origin/dev',
    r"import Sidebar from '@/components/layout/Sidebar';\nimport GlobalEmergencyListener from '@/components/GlobalEmergencyListener';\nimport TaskDetailModal from './_components/TaskDetailModal/TaskDetailModal';\n\nexport default function StaffDashboard() {",
    content
)

# Block 2: Layout
# <<<<<<< HEAD
#     <div className={styles.container}>
#       <div className={styles.headerContainer}>
#           <header className={styles.header}>
#             <h1 className={styles.title}>{departmentName} 관리</h1>
#             <p className={styles.subtitle}>{departmentName} 전용 채널</p>
#           </header>
# =======
#     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
#       <GlobalEmergencyListener />
#       <div className={styles.container} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
#         <Sidebar role={departmentRole} fakePathname={view === 'my' ? '/staff?view=my' : '/staff'} />
# 
#         <main className={styles.mainContent} style={{ overflowY: 'auto' }}>
#           <div className={styles.headerContainer}>
#             <header className={styles.header}>
#               <h1 className={styles.title}>{departmentName} 관리</h1>
#               <p className={styles.subtitle}>{departmentName} 전용 채널</p>
#             </header>
# >>>>>>> origin/dev

content = re.sub(
    r'<<<<<<< HEAD\n    <div className=\{styles\.container\}>\n      <div className=\{styles\.headerContainer\}>\n          <header className=\{styles\.header\}>\n            <h1 className=\{styles\.title\}>\{departmentName\} 관리</h1>\n            <p className=\{styles\.subtitle\}>\{departmentName\} 전용 채널</p>\n          </header>\n=======\n    <div style=\{\{ display: \'flex\', flexDirection: \'column\', height: \'100vh\', overflow: \'hidden\' \}\}>\n      <GlobalEmergencyListener />\n      <div className=\{styles\.container\} style=\{\{ flex: 1, minHeight: 0, overflow: \'hidden\' \}\}>\n        <Sidebar role=\{departmentRole\} fakePathname=\{view === \'my\' \? \'/staff\?view=my\' : \'/staff\'\} />\n\n        <main className=\{styles\.mainContent\} style=\{\{ overflowY: \'auto\' \}\}>\n          <div className=\{styles\.headerContainer\}>\n            <header className=\{styles\.header\}>\n              <h1 className=\{styles\.title\}>\{departmentName\} 관리</h1>\n              <p className=\{styles\.subtitle\}>\{departmentName\} 전용 채널</p>\n            </header>\n>>>>>>> origin/dev',
    r"    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>\n      <GlobalEmergencyListener />\n      <div className={styles.container} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>\n        <Sidebar role={departmentRole} fakePathname={view === 'my' ? '/staff?view=my' : '/staff'} />\n\n        <main className={styles.mainContent} style={{ overflowY: 'auto' }}>\n          <div className={styles.headerContainer}>\n            <header className={styles.header}>\n              <h1 className={styles.title}>{departmentName} 관리</h1>\n              <p className={styles.subtitle}>{departmentName} 전용 채널</p>\n            </header>",
    content
)

# Block 3: Board
# We need to extract the board from HEAD, and append the closing tags from dev.
pattern = re.compile(
    r'<<<<<<< HEAD\n\s*\{loading \? \(\n\s*<div className=\{styles\.loading\}>데이터를 불러오는 중\.\.\.<\/div>\n\s*\) : error \? \(\n\s*<div className=\{styles\.error\}>데이터를 불러오는 데 실패했습니다\. \(\{error\}\)<\/div>\n\s*\) : \(\n(.*?)\s*\)\}\n=======\n.*?>>>>>>> origin/dev',
    re.DOTALL
)

def board_replacer(match):
    board_content = match.group(1)
    return f"""          {{loading ? (
            <div className={{styles.loading}}>데이터를 불러오는 중...</div>
          ) : error ? (
            <div className={{styles.error}}>데이터를 불러오는 데 실패했습니다. ({{error}})</div>
          ) : (
{board_content}
          )}}
        </main>
      </div>
    </div>"""

content = pattern.sub(board_replacer, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Resolved " + filepath)
