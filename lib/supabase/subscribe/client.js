const supabasejs = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_TELEGRAM_BOTS_URL;
// const supabaseKey = process.env.SUPABASE_TELEGRAM_BOTS_KEY;
const supabaseKey = process.env.SUPABASE_SERVICE_API_TELEGRAM_BOTS_KEY;

const supabase = supabasejs.createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
