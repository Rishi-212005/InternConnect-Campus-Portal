import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Admin users to create
const adminUsers = [
  {
    email: 'placementcell@gmail.com',
    password: 'placementcell@2025',
    full_name: 'Placement Cell Admin',
    role: 'placement' as const,
  },
  {
    email: 'codecrewadmin@gmail.com',
    password: 'codecrewadmin@2025',
    full_name: 'System Administrator',
    role: 'admin' as const,
  },
  {
    email: 'codecrewrecruiter@gmail.com',
    password: 'codecrewrecruiter@2025',
    full_name: 'Default Recruiter',
    role: 'recruiter' as const,
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results = [];

    for (const user of adminUsers) {
      console.log(`Processing user: ${user.email}`);

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === user.email);

      if (existingUser) {
        console.log(`User ${user.email} already exists, skipping creation`);
        results.push({ email: user.email, status: 'already_exists' });
        continue;
      }

      // Create user with admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
        },
      });

      if (authError) {
        console.error(`Error creating user ${user.email}:`, authError);
        results.push({ email: user.email, status: 'error', error: authError.message });
        continue;
      }

      const userId = authData.user.id;
      console.log(`Created auth user: ${userId}`);

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: userId,
          email: user.email,
          full_name: user.full_name,
        });

      if (profileError) {
        console.error(`Error creating profile for ${user.email}:`, profileError);
      }

      // Assign role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: user.role,
        });

      if (roleError) {
        console.error(`Error assigning role for ${user.email}:`, roleError);
      }

      // Create role-specific profile
      if (user.role === 'recruiter') {
        const { error: recruiterError } = await supabaseAdmin
          .from('recruiter_profiles')
          .insert({
            user_id: userId,
            company_name: 'CodeCrew Recruiting',
            is_verified: true,
          });
        if (recruiterError) {
          console.error(`Error creating recruiter profile for ${user.email}:`, recruiterError);
        }
      }

      results.push({ email: user.email, status: 'created', userId });
      console.log(`Successfully created user: ${user.email}`);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in seed-admin-users:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
