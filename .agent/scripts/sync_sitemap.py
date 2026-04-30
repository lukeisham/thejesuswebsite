# =============================================================================
#   THE JESUS WEBSITE — SITEMAP SYNC TOOL (AGENT UTILITY)
#   File:    .agent/scripts/sync_sitemap.py
#   Version: 1.1.0
#   Purpose: Merges all module-level ASCII file trees from module_sitemap.md
#            into the master site_map.md and auto-increments its version number.
#
#   DATA FLOW:
#     Input   →  documentation/module_sitemap.md  ("Files to create Structure" blocks)
#     Output  →  documentation/site_map.md         (```text master tree, version field)
#
#   USAGE:
#     Run from the project root:
#       python3 .agent/scripts/sync_sitemap.py
#
#   QUIRKS:
#     - The parser strips ASCII box-drawing characters to calculate indent depth.
#     - Depth is computed as (leading whitespace + branch chars) // 4.
#     - All trees are merged into a single sorted dict before rendering.
# =============================================================================
import re
import os
import sys

MODULE_FILE = 'documentation/detailed_module_sitemap.md'
SITE_FILE = 'documentation/site_map.md'

def parse_ascii_tree(block):
    """
    Parses a raw ASCII file-tree block into a list of (path_list, is_dir, annotation) tuples.
    Strips box-drawing characters (├──, └──, │) to determine node depth.
    """
    paths = []
    lines = block.strip().split('\n')
    stack = {}
    
    for line in lines:
        if not line.strip(): continue
        
        # Split out annotations
        parts = line.split('<--')
        node_part = parts[0]
        annotation = ('<-- ' + parts[1].strip()) if len(parts) > 1 else ''
        
        # Calculate depth more robustly
        # Remove common ASCII branch characters
        clean_line = node_part
        for char in ['├──', '└──', '│', ' ', '├', '└', '─']:
            clean_line = clean_line.replace(char, ' ')
        
        # Original indentation is usually 4 spaces per level
        full_len = len(node_part)
        trimmed_len = len(node_part.lstrip(' ├──└──│└─├─'))
        spaces = full_len - trimmed_len
        depth = spaces // 4
        
        node_name = node_part.strip(' ├──└──│└─├─').strip()
        if not node_name: continue
        
        # Maintain path stack
        stack[depth] = node_name
        current_path = [stack[d].strip('/') for d in range(depth + 1) if d in stack]
        
        is_dir = node_name.endswith('/') or node_part.strip().endswith('/')
        paths.append((current_path, is_dir, annotation))
        
    return paths

def build_dict_tree(all_paths):
    """
    Converts a flat list of path tuples into a nested dictionary representing
    the full directory tree. Tracks is_dir and annotation per node.
    """
    root = {}
    for path_list, is_dir, annot in all_paths:
        current = root
        for i, part in enumerate(path_list):
            if part not in current:
                current[part] = {'_is_dir': False, '_annot': ''}
            
            if i == len(path_list) - 1:
                current[part]['_is_dir'] = is_dir
                if annot:
                    current[part]['_annot'] = annot
            
            current = current[part]
    return root

def render_ascii_tree(tree, indent=''):
    """
    Recursively renders a nested dict tree back into an ASCII file-tree string.
    Uses ├── for non-last entries and └── for the last entry at each level.
    """
    lines = []
    # Filter out internal tracking keys
    keys = sorted([k for k in tree.keys() if not k.startswith('_')])
    for i, key in enumerate(keys):
        is_last = (i == len(keys) - 1)
        node = tree[key]
        
        prefix = '└── ' if is_last else '├── '
        display_name = key + ('/' if node.get('_is_dir') and not key.endswith('/') else '')
        annot = node.get('_annot', '')
        
        # If it's the absolute root level (e.g. no indent), we might not use the prefix if we want it to look like `/`
        if indent == '' and key == '':
            display_name = '/'
            line = f"{display_name:<31} {annot}".strip()
            lines.append(line)
        else:
            line_str = f"{indent}{prefix}{display_name}"
            if annot:
                # pad to align annotations
                pad_len = max(31 - len(line_str), 1)
                line_str += (" " * pad_len) + annot
            lines.append(line_str)
        
        next_indent = indent + ('    ' if is_last else '│   ')
        # Recursive render
        lines.extend(render_ascii_tree(node, next_indent))
    return lines

def main():
    """
    Trigger:  Run this script directly from the project root.
    Function: Reads all module trees from module_sitemap.md, merges them, renders
              the combined ASCII tree, and writes it back to site_map.md.
    Output:   Updated site_map.md with a bumped patch version and refreshed master tree.
    """
    if not os.path.exists(MODULE_FILE):
        print(f"Error: {MODULE_FILE} not found.")
        sys.exit(1)
        
    with open(MODULE_FILE, 'r') as f:
        content = f.read()

    # Extract blocks - handle both old and new headers
    blocks = re.findall(r'\*\*(?:Files to create Structure|Supporting Files [^:]+):\*\*\s*```\w*\n(.*?)\n```', content, re.DOTALL)
    
    all_paths = []
    for block in blocks:
        all_paths.extend(parse_ascii_tree(block))
        
    # Build merged tree
    master_tree = build_dict_tree(all_paths)
    ascii_lines = render_ascii_tree(master_tree)
    tree_text = "```text\n" + "\n".join(ascii_lines) + "\n```"

    # Read and update site_map.md
    if not os.path.exists(SITE_FILE):
        print(f"Error: {SITE_FILE} not found.")
        sys.exit(1)
        
    with open(SITE_FILE, 'r') as f:
        site_content = f.read()
        
    # Increment version
    def parse_version(match):
        v = match.group(1).split('.')
        # Increment patch version
        v[-1] = str(int(v[-1]) + 1)
        return 'version: ' + '.'.join(v)
        
    site_content = re.sub(r'version:\s*([0-9\.]+)', parse_version, site_content)
    
    # Replace the Master Site Map tree
    # Assumes the tree is between ``` (with optional label) and ```
    if '```text' in site_content:
        new_site_content = re.sub(r'```text\n.*?\n```', tree_text, site_content, flags=re.DOTALL)
    else:
        new_site_content = re.sub(r'```\n.*?\n```', tree_text, site_content, flags=re.DOTALL)
    
    with open(SITE_FILE, 'w') as f:
        f.write(new_site_content)
        
    print(f"Successfully merged trees from {len(blocks)} modules and updated {SITE_FILE}.")

if __name__ == '__main__':
    main()
