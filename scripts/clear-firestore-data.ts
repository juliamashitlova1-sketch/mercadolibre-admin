/**
 * Firestore 数据清空脚本
 * 
 * 用法: npx tsx clear-firestore-data.ts
 * 
 * 此脚本会清空以下所有集合:
 *   - dailyStats    (每日统计)
 *   - skuStats      (SKU数据)
 *   - claims        (纠纷记录)
 *   - operationLogs (运营日志)
 */

import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldPath } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从项目配置文件读取 Firebase 配置
const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'firebase-applet-config.json');

if (!fs.existsSync(configPath)) {
  console.error('❌ 找不到配置文件: firebase-applet-config.json');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// 初始化 Firebase Admin (需要服务账户密钥)
// 如果没有 service-account-key.json，会提示用户
const serviceAccountPath = path.join(projectRoot, 'serviceAccountKey.json.json');

let app: App;
try {
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════╗');
    console.error('║  ❌ 缺少 Firebase 服务账户密钥文件              ║');
    console.error('╠══════════════════════════════════════════════════════╣');
    console.error('║                                                    ║');
    console.error('║  请按以下步骤操作:                                 ║');
    console.error('║  1. 打开 Firebase Console                         ║');
    console.error('║     https://console.firebase.google.com            ║');
    console.error('║  2. 选择项目: gen-lang-client-0561455868          ║');
    console.error('║  3. 左侧菜单 → 项目设置 → 服务账户               ║');
    console.error('║  4. 点击 "生成新私钥"                             ║');
    console.error('║  5. 下载 JSON 文件并重命名为:                      ║');
    console.error('║     serviceAccountKey.json                        ║');
    console.error('║  6. 将文件放到项目根目录下                          ║');
    console.error('║     (c:\\Users\\Administrator\\Desktop\\美客多软件)      ║');
    console.error('║                                                    ║');
    console.error('║  然后重新运行此脚本                               ║');
    console.error('╚══════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf-8')
  );

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: firebaseConfig.projectId || serviceAccount.project_id,
  });
} catch (err) {
  console.error('初始化 Firebase 失败:', err);
  process.exit(1);
}

// 使用 databaseId 连接到指定的 Firestore 数据库实例
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// 要清空的集合列表
const COLLECTIONS_TO_CLEAR = [
  'dailyStats',
  'skuStats', 
  'claims',
  'operationLogs'
];

/**
 * 删除单个集合中的所有文档
 * 使用批量删除，每批最多 500 条
 */
async function clearCollection(collectionName: string): Promise<number> {
  let deletedCount = 0;
  
  try {
    const collectionRef = db.collection(collectionName);
    
    // 循环获取并删除文档，直到集合为空
    while (true) {
      const snapshot = await collectionRef.limit(500).get();
      
      if (snapshot.empty) {
        break;
      }
      
      // 批量删除
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += snapshot.size;
      
      // 显示进度
      process.stdout.write(`\r  🗑️  ${collectionName}: 已删除 ${deletedCount} 条...`);
    }
    
    console.log(`\r  ✅ ${collectionName}: 共删除 ${deletedCount} 条记录     `);
    
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      console.log(`\r  ⏭️  ${collectionName}: 集合不存在或已为空           `);
    } else {
      throw error;
    }
  }
  
  return deletedCount;
}

/**
 * 主函数
 */
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       🗑️  Firestore 数据清空工具                    ║');
  console.error('╠══════════════════════════════════════════════════════╣');
  console.log('║                                                    ║');
  console.log('║  ⚠️  此操作将永久删除以下所有数据!                  ║');
  console.log('║     • dailyStats    (每日统计)                     ║');
  console.log('║     • skuStats      (SKU数据)                      ║');
  console.log('║     • claims        (纠纷记录)                     ║');
  console.log('║     • operationLogs (运营日志)                     ║');
  console.log('║                                                    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  
  // 确认提示
  const args = process.argv.slice(2);
  const forceMode = args.includes('--force') || args.includes('-f');
  
  if (!forceMode) {
    console.log('💡 提示: 如需跳过确认，可使用参数 --force 或 -f');
    console.log('');
    console.log('⏳ 请在 10 秒内按 Ctrl+C 取消...');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  console.log('');
  console.log('🚀 开始清空数据...\n');
  
  let totalDeleted = 0;
  const results: Record<string, number> = {};
  
  for (const collection of COLLECTIONS_TO_CLEAR) {
    const count = await clearCollection(collection);
    results[collection] = count;
    totalDeleted += count;
  }
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 所有数据已清空!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📊 清空统计:');
  Object.entries(results).forEach(([name, count]) => {
    console.log(`   • ${name}: ${count} 条`);
  });
  console.log('');
  console.log(`   📌 总计删除: ${totalDeleted} 条记录`);
  console.log('');
  console.log('🎉 现在你可以开始录入自己的系统数据了！');
  console.log('');
  
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ 清空数据时出错:', error);
  process.exit(1);
});
