
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://gsjhsmxyxjyiqovauyrp.supabase.co'
const supabaseAnonKey = 'sb_publishable_vXBSa3eP8cvjIK2qLWI6Ug_FoYm4CNy'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
    console.log("Fetching 1 record from 'users'...")
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1)

    if (error) {
        console.error("Error:", error)
    } else {
        if (data && data.length > 0) {
            console.log("Record found. Keys:", Object.keys(data[0]))
            console.log("Sample Data:", JSON.stringify(data[0], null, 2))
        } else {
            console.log("Table 'users' is empty or no read access.")
        }
    }
}

checkSchema()
