const supabasejs = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_WB_ACCEPTANCE_RATE_BOT_URL;
const supabaseKey = process.env.SUPABASE_WB_ACCEPTANCE_RATE_BOT_SERVICE_API_KEY;

const supabase = supabasejs.createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
