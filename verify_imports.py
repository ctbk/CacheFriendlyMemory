import os
import re
import sys

def resolve_path(base_dir, import_path):
    if import_path.startswith('.'):
        return os.path.abspath(os.path.join(base_dir, import_path))
    else:
        return None

def main():
    extension_dir = os.getcwd()
    errors = []
    
    for root, dirs, files in os.walk(extension_dir):
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = re.findall(r'import\s+.*from\s+[\'"](.+?)[\'"]', content)
                    for import_path in matches:
                        if import_path.startswith('.'):
                            resolved = resolve_path(os.path.dirname(filepath), import_path)
                            if resolved and not os.path.exists(resolved):
                                errors.append((filepath, import_path, resolved))
    if errors:
        print("Missing imports:")
        for filepath, import_path, resolved in errors:
            print(f"  {filepath}: {import_path} -> {resolved}")
        sys.exit(1)
    else:
        print("All imports resolve to existing files.")
        sys.exit(0)

if __name__ == '__main__':
    main()
