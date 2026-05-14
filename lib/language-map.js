const LANGUAGE_MAP = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.r': 'r',
  '.R': 'r',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.html': 'html',
  '.htm': 'html',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',
  '.md': 'markdown',
  '.txt': 'text',
  '.sql': 'sql',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.bat': 'batch',
  '.cmd': 'batch',
  '.ps1': 'powershell',
  '.dockerfile': 'dockerfile',
  '.docker': 'dockerfile',
  '.env': 'text',
  '.gitignore': 'text',
  '.lua': 'lua',
  '.dart': 'dart',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.ml': 'ocaml',
  '.clj': 'clojure',
  '.lisp': 'lisp',
  '.proto': 'protobuf',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.tf': 'hcl',
  '.ini': 'ini',
  '.cfg': 'ini',
  '.conf': 'text',
  '.log': 'text',
  '.csv': 'text',
  '.tsv': 'text'
};

function getLanguage(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return LANGUAGE_MAP[ext] || 'text';
}

function formatFileContent(filePath, content) {
  const filename = filePath.split('/').pop();
  const lang = getLanguage(filename);

  // Find the longest run of backticks in content to avoid conflicts
  let maxBackticks = 2;
  const matches = content.match(/`{3,}/g);
  if (matches) {
    for (const m of matches) {
      if (m.length >= maxBackticks) maxBackticks = m.length;
    }
  }
  const fence = '`'.repeat(maxBackticks + 1);

  return `\`${filePath}\`:\n${fence}${lang}\n${content}\n${fence}`;
}
