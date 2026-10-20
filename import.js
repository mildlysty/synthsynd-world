const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://mlpzrqocuwsepundcqwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1scHpycW9jdXdzZXB1bmRjcXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTc3NzgsImV4cCI6MjEwNzk3Mzc3OH0.NIXYAMKfnu0smaDUMK1o6jDYVDUw35QqqIAF-mxBuro'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Reading JSON file...");
  const rawData = fs.readFileSync('C:\\Users\\Admin\\Desktop\\pure-swarm-data.json', 'utf8');
  const json = JSON.parse(rawData);

  let dataNode = null;
  if (Array.isArray(json) && json[0]?.result?.data?.json) {
    dataNode = json[0].result.data.json;
  } else if (json.value && Array.isArray(json.value) && json.value[0]?.result?.data?.json) {
    dataNode = json.value[0].result.data.json;
  } else if (json.agents || json.prompts || json.tools) {
    dataNode = json;
  }

  let allItems = [];
  if (dataNode.agents) allItems.push(...dataNode.agents);
  if (dataNode.prompts) allItems.push(...dataNode.prompts);
  if (dataNode.tools) allItems.push(...dataNode.tools);

  console.log(`Found ${allItems.length} items. Updating database with images...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    
    // WE ADDED image_url HERE!
    const safeItem = {
      id: item.id,
      name: item.name || 'Unnamed Agent',
      description: item.description || '',
      image_url: item.image_url || null, 
      price_usd: item.price_usd || 0,
      user_id: item.user_id || '00000000-0000-0000-0000-000000000000',
      is_free: item.is_free || false,
      created_at: item.created_at || new Date().toISOString()
    };

    // Use UPSERT to update the existing rows
    const { error } = await supabase.from('agents').upsert([safeItem]);
    
    if (error) {
      console.log(`Failed row ${i}: ${error.message}`);
      failCount++;
    } else {
      successCount++;
    }

    if (i % 100 === 0 && i > 0) {
      console.log(`Processed ${i} items... (${successCount} success, ${failCount} failed)`);
    }
  }
  
  console.log(`\nDone! Successfully updated ${successCount} agents. Failed: ${failCount}`);
}

main();