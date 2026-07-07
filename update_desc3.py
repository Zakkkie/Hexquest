import re
import glob

def enhance_goal(desc):
    if 'ПОДКЛЮЧЕНИЕ' in desc or 'КОНТРОЛЬ' in desc or 'АКТИВАЦИЯ' in desc:
        return desc
    return desc

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    def repl(m):
        old_desc = m.group(1)
        new_desc = enhance_goal(old_desc)
        return f"goalText: '{new_desc}'"

    content = re.sub(r"goalText:\s*'([^']+)'", repl, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for filepath in glob.glob('campaign/*.ts'):
    process_file(filepath)
