#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { parseFileNameInfo, parseJobContent, generateJobEmbedding } from '../src/lib/job-parser'
import { extractJobPostingText } from '../src/lib/server-utils'

// 環境変数の読み込み
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
const JOBS_FOLDER_PATH = process.argv[2] || '/Users/ueyamatakuma/Desktop/5_firm+'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// サポートするファイル拡張子
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt']

// ファイルを再帰的に検索
function findJobFiles(dir: string): string[] {
  const files: string[] = []
  
  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory()) {
        // ディレクトリの場合は再帰的に探索
        walk(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push(fullPath)
        }
      }
    }
  }
  
  walk(dir)
  return files
}

// ファイルをインポート
async function importJobFile(filePath: string) {
  try {
    console.log(`処理中: ${filePath}`)
    
    const fileName = path.basename(filePath)
    const fileBuffer = fs.readFileSync(filePath)
    
    // MIMEタイプの判定
    const ext = path.extname(fileName).toLowerCase()
    let mimeType = 'text/plain'
    if (ext === '.pdf') mimeType = 'application/pdf'
    else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    
    // ファイル名から基本情報を抽出
    const fileNameInfo = parseFileNameInfo(fileName)
    
    // テキスト抽出
    const rawContent = await extractJobPostingText(fileBuffer, fileName, mimeType)
    
    if (!rawContent || rawContent.trim().length === 0) {
      console.warn(`⚠️  テキストを抽出できませんでした: ${fileName}`)
      return false
    }
    
    // 既存の求人をチェック
    const { data: existing } = await supabase
      .from('jobs')
      .select('id')
      .eq('file_name', fileName)
      .single()
    
    if (existing) {
      console.log(`⏭️  既に登録済み: ${fileName}`)
      return true
    }
    
    // 求人情報を構造化
    const parsedData = await parseJobContent(rawContent, fileNameInfo)
    
    // ベクトル埋め込みを生成
    const embedding = await generateJobEmbedding(parsedData)
    
    // データベースに保存
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        company_name: parsedData.company_name,
        job_title: parsedData.job_title,
        department: parsedData.department,
        job_description: parsedData.job_description,
        requirements: parsedData.requirements,
        skills: parsedData.skills || [],
        employment_type: parsedData.employment_type,
        location: parsedData.location,
        salary_range: parsedData.salary_range,
        file_path: filePath,
        file_name: fileName,
        raw_content: rawContent,
        parsed_data: parsedData,
        embedding,
        is_active: true
      })
      .select('id, company_name, job_title')
      .single()
    
    if (error) {
      console.error(`❌ 保存エラー: ${fileName}`, error.message)
      return false
    }
    
    console.log(`✅ インポート成功: ${job.company_name} - ${job.job_title}`)
    return true
    
  } catch (error) {
    console.error(`❌ エラー: ${filePath}`, error)
    return false
  }
}

// メイン処理
async function main() {
  console.log('=== 求人情報バッチインポート ===')
  console.log(`対象フォルダ: ${JOBS_FOLDER_PATH}`)
  
  if (!fs.existsSync(JOBS_FOLDER_PATH)) {
    console.error('指定されたフォルダが存在しません')
    process.exit(1)
  }
  
  // 求人ファイルを検索
  const jobFiles = findJobFiles(JOBS_FOLDER_PATH)
  console.log(`\n見つかったファイル数: ${jobFiles.length}`)
  
  if (jobFiles.length === 0) {
    console.log('インポート可能なファイルが見つかりませんでした')
    return
  }
  
  // 確認
  console.log('\nインポートを開始しますか？ (y/n)')
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  const answer = await new Promise<string>(resolve => {
    readline.question('', (ans: string) => {
      readline.close()
      resolve(ans)
    })
  })
  
  if (answer.toLowerCase() !== 'y') {
    console.log('キャンセルしました')
    return
  }
  
  // バッチ処理
  console.log('\n処理を開始します...\n')
  let successCount = 0
  let errorCount = 0
  
  for (const filePath of jobFiles) {
    const success = await importJobFile(filePath)
    if (success) {
      successCount++
    } else {
      errorCount++
    }
    
    // レート制限対策（1秒待機）
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n=== 処理完了 ===')
  console.log(`成功: ${successCount}件`)
  console.log(`エラー: ${errorCount}件`)
  console.log(`合計: ${jobFiles.length}件`)
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error)
}

export { findJobFiles, importJobFile }