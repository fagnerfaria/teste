// The Windows auth mirror relies on filesystem ACLs. The helper receives paths
// through its environment and never receives or emits token contents.
const ACL_SCRIPT =
  "$ErrorActionPreference = 'Stop'\nfunction Check-Reparse($item) {\n  if ($item.Exists -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Reparse point' }\n}\n$current = [Security.Principal.WindowsIdentity]::GetCurrent().User\n$trusted = @($current.Value, 'S-1-5-18', 'S-1-5-32-544')\nfunction Check-Private($item) {\n  Check-Reparse $item\n  $acl = $item.GetAccessControl()\n  if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $trusted) { throw 'Unexpected owner' }\n  foreach ($ace in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {\n    if ($ace.AccessControlType -eq 'Allow' -and $ace.IdentityReference.Value -notin $trusted) { throw 'Unexpected access grant' }\n  }\n}\n$dir = [IO.DirectoryInfo]::new($env:AGENTAGE_PRIVATE_AUTH_DIR)\nif ($dir.FullName -notmatch '^[A-Za-z]:\\\\') { throw 'Local drive required' }\nfor ($entry = $dir; $null -ne $entry; $entry = $entry.Parent) { Check-Reparse $entry }\nif (!$dir.Exists -and $env:AGENTAGE_PRIVATE_AUTH_CREATE -eq '1') {\n  $acl = [Security.AccessControl.DirectorySecurity]::new()\n  $acl.SetAccessRuleProtection($true, $false)\n  $acl.SetOwner($current)\n  foreach ($sid in $trusted) {\n    $id = [Security.Principal.SecurityIdentifier]::new($sid)\n    $rule = [Security.AccessControl.FileSystemAccessRule]::new($id, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')\n    $acl.AddAccessRule($rule)\n  }\n  [IO.Directory]::CreateDirectory($dir.FullName, $acl) | Out-Null\n  $dir.Refresh()\n}\nif (!$dir.Exists) { throw 'Missing auth directory' }\nCheck-Private $dir\n$file = [IO.FileInfo]::new([IO.Path]::Combine($dir.FullName, 'auth.json'))\nCheck-Reparse $file\nif ($file.Exists) { Check-Private $file }";

export async function requirePrivateWindowsAuth(dir: string, create: boolean): Promise<void> {
  if (process.platform !== 'win32') return;
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot) throw new Error('Windows credential folder permissions could not be verified.');
  const { join } = await import('node:path');
  const { execFile } = await import('node:child_process');
  const executable = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const command = Buffer.from(ACL_SCRIPT, 'utf16le').toString('base64');
  await new Promise<void>((resolve, reject) => {
    execFile(
      executable,
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', command],
      {
        windowsHide: true,
        timeout: 10_000,
        env: {
          ...process.env,
          AGENTAGE_PRIVATE_AUTH_DIR: dir,
          AGENTAGE_PRIVATE_AUTH_CREATE: create ? '1' : '0',
        },
      },
      (error) => {
        if (error)
          reject(new Error('Windows credential folder permissions could not be verified.'));
        else resolve();
      }
    );
  });
}
