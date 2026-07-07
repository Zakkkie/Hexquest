import re
import glob

def enhance_description(desc):
    # Already enhanced?
    if 'ПРОТОКОЛ' in desc or 'ИНЖЕНЕРИЯ' in desc or 'Внимание:' in desc or 'АНАЛИЗ' in desc or 'ЦЕЛЬ:' in desc or 'ГЕОМЕТРИЯ' in desc or 'ВЕРТИКАЛЬНАЯ' in desc:
        return desc
    
    desc = desc.strip()
    
    # Generic enhancements based on keywords
    if 'Выжить' in desc or 'Выживание' in desc or 'Продержаться' in desc:
        return f"ПРОТОКОЛ ВЫЖИВАНИЯ. {desc} Активируйте защитные паттерны и следите за стабильностью сектора."
    if 'Опередить' in desc or 'Остановите' in desc or 'Уничтожить' in desc or 'Отбить' in desc or 'Противостоять' in desc:
        return f"ТАКТИЧЕСКИЙ ПЕРЕХВАТ. {desc} ИИ-противник активен и использует агрессивные алгоритмы подавления."
    if 'Поиск' in desc or 'Собрать' in desc or 'Найти' in desc or 'Накопить' in desc:
        return f"МАТЕРИАЛЬНЫЙ СИНТЕЗ. {desc} Оптимизируйте маршруты сбора, чтобы опередить деградацию кластера."
    if 'Возвести' in desc or 'Построить' in desc or 'Сформировать' in desc or 'Выстроить' in desc:
        return f"СТРУКТУРНОЕ ФОРМАТИРОВАНИЕ. {desc} Требуется предельная точность позиционирования блоков в нестабильной зоне."
    if 'Доставить' in desc or 'Достичь' in desc:
        return f"ЛОГИСТИЧЕСКИЙ ВЕКТОР. {desc} Избегайте столкновений с защитными подпрограммами ИИ."
    if 'туман' in desc.lower() or 'видимости' in desc.lower():
        return f"СЕНСОРНАЯ ДЕПРИВАЦИЯ. {desc} Оптические датчики отключены. Действуйте в условиях нулевой видимости."
        
    return f"СИСТЕМНАЯ ДИРЕКТИВА. {desc} Следуйте указаниям навигационного модуля и берегите ресурсы."

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    def repl(m):
        old_desc = m.group(1)
        # Also clean up the single quotes
        new_desc = enhance_description(old_desc)
        return f"description: '{new_desc}'"

    # Match description: '...'
    content = re.sub(r"description:\s*'([^']+)'", repl, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for filepath in glob.glob('campaign/*.ts'):
    process_file(filepath)
