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
  if (json.value && Array.isArray(json.value) && json.value[0]?.result?.data?.json) {
    dataNode = json.value[0].result.data.json;
  } else if (Array.isArray(json) && json[0]?.result?.data?.json) {
    dataNode = json[0].result.data.json;
  } else {
    dataNode = json;
  }

  let allItems = [];
  if (dataNode.agents) allItems.push(...dataNode.agents);
  if (dataNode.prompts) allItems.push(...dataNode.prompts);
  if (dataNode.tools) allItems.push(...dataNode.tools);

  console.log(`Found ${allItems.length} items. Updating ONLY images...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    
    if (item.image_url) {
      const { data, error } = await supabase
        .from('agents')
        .update({ image_url: item.image_url })
        .eq('id', item.id)
        .select();
        
      if (error) {
        console.log(`Error on ${item.id}:`, error.message);
        failCount++;
      } else {
        successCount++;
      }
    }

    if (i % 200 === 0 && i > 0) {
      console.log(`Processed ${i} items... (${successCount} images updated)`);
    }
  }
  
  console.log(`\nDone! Successfully updated ${successCount} images. Failed: ${failCount}`);
}

main();