"use client";

import { Button } from "@/components/ui/button";
import { checkDatabaseSetup } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TowerControl as GameController, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase, getSupabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  // Track rate limiting by email
  const [rateLimitMap, setRateLimitMap] = useState<{[email: string]: {timestamp: number, cooldown: number}}>({});
  const { toast } = useToast();

  // Calculate password strength
  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 8) score += 20;
    if (pass.match(/[A-Z]/)) score += 20;
    if (pass.match(/[a-z]/)) score += 20;
    if (pass.match(/[0-9]/)) score += 20;
    if (pass.match(/[^A-Za-z0-9]/)) score += 20;
    setPasswordStrength(score);
  };

  useEffect(() => {
    calculatePasswordStrength(password);
  }, [password]);

  // Request password suggestions from Google Password Manager
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      if (passwordInput && 'credentials' in navigator) {
        passwordInput.autocomplete = 'new-password';
      }
    }
  }, []);

  const router = useRouter();

  // Initialize Supabase client when component mounts and check database setup
  useEffect(() => {
    const init = async () => {
      // Make sure Supabase client is loaded
      const supabaseClient = getSupabase();
      if (!supabaseClient) {
        toast({
          variant: "destructive",
          title: "Connection error",
          description: "Could not connect to Supabase. Please check your environment variables.",
        });
        return;
      }

      // Check if database tables are set up correctly
      const dbStatus = await checkDatabaseSetup();
      
      // If database setup is incorrect, redirect to setup page
      if (!dbStatus.success) {
        console.log('Database setup issue:', dbStatus.message);
        toast({
          variant: "destructive",
          title: "Database setup needed",
          description: "Redirecting to setup page to configure your database.",
        });
        router.push('/supabase-setup');
      }
    };

    init();
  }, [router, toast]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Check if the email is rate-limited
    const now = Date.now();
    const emailLimit = rateLimitMap[email];
    
    if (email && emailLimit) {
      const elapsed = now - emailLimit.timestamp;
      if (elapsed < emailLimit.cooldown) {
        const remainingSeconds = Math.ceil((emailLimit.cooldown - elapsed) / 1000);
        toast({
          variant: "destructive",
          title: "Rate limit active",
          description: `This email address is rate-limited. Please wait ${remainingSeconds} seconds before trying again.`,
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      // Ensure we have a valid Supabase client
      const supabaseClient = getSupabase();
      if (!supabaseClient) {
        throw new Error("Supabase client initialization failed. Check your environment variables.");
      }

      // Track this attempt for the email
      setRateLimitMap(prev => ({
        ...prev,
        [email]: { timestamp: now, cooldown: 0 }
      }));

      console.log(`Attempting to ${isSignUp ? 'sign up' : 'sign in'} with email: ${email}`);

      if (isSignUp) {
        console.log('Starting sign up process...');
        const { error: signUpError, data } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              role: "developer", // Default role for new users
            },
          },
        });
        
        console.log('Sign up response:', signUpError ? `Error: ${signUpError.message}` : 'Success');

        if (signUpError) throw signUpError;

        // Create employee record only if user was created successfully
        if (data.user) {
          const { error: employeeError } = await supabaseClient
            .from("employees")
            .insert([
              {
                id: data.user.id, // This matches auth.uid() for RLS
                email,
                name,
                role: "developer",
              },
            ])
            .select()
            .single();

          if (employeeError) throw employeeError;
          
          toast({
            title: "Welcome to Game Studio Tracker!",
            description: "Your account has been created successfully.",
          });

          // Redirect to dashboard after successful signup
          router.push('/dashboard');
        } else {
          // This happens when an email confirmation is needed
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation email. Please confirm your account.",
          });
        }
      } else {
        console.log('Starting sign in process...');
        const { error, data } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        console.log('Sign in response:', error ? `Error: ${error.message}` : 'Success', 
                   data ? `User: ${data.user?.email}` : 'No user data');

        if (error) throw error;

        if (data.user) {
          toast({
            title: "Welcome back!",
            description: "Successfully logged in to Game Studio Tracker.",
          });
          
          // Redirect to dashboard after successful login
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Extract more detailed error information
      const errorMessage = error.message || 'Unknown error';
      const errorCode = error.code || 'no_code';
      const errorDetails = error.details || 'No additional details';
      
      console.error(`Error code: ${errorCode}, Message: ${errorMessage}, Details: ${errorDetails}`);
      
      // Handle rate limiting errors specifically
      if (errorCode === 'over_email_send_rate_limit' || errorMessage.includes('security purposes') || errorMessage.includes('rate limit')) {
        // Extract the wait time from error message if available
        let waitTime = 45000; // Default to 45 seconds if we can't parse it
        const timeMatch = errorMessage.match(/after (\d+) seconds/);
        if (timeMatch && timeMatch[1]) {
          waitTime = parseInt(timeMatch[1]) * 1000 + 5000; // Add a 5 second buffer to be safe
        }
        
        // Store the rate limit for this specific email
        setRateLimitMap(prev => ({
          ...prev,
          [email]: { timestamp: now, cooldown: waitTime }
        }));
        
        const waitSeconds = Math.ceil(waitTime / 1000);
        
        toast({
          variant: "destructive",
          title: "Rate limit exceeded",
          description: `For security reasons, this email address is now rate-limited. Please wait ${waitSeconds} seconds before trying again.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: isSignUp ? "Sign up failed" : "Login failed",
          description: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 20) return "bg-red-500";
    if (passwordStrength <= 40) return "bg-orange-500";
    if (passwordStrength <= 60) return "bg-yellow-500";
    if (passwordStrength <= 80) return "bg-blue-500";
    return "bg-green-500";
  };

  // Update rate limit timers
  useEffect(() => {
    if (Object.keys(rateLimitMap).length === 0) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      let updated = false;
      
      const newMap = {...rateLimitMap};
      
      // Check each email in the map
      Object.keys(newMap).forEach(email => {
        const data = newMap[email];
        const elapsed = now - data.timestamp;
        
        if (elapsed >= data.cooldown) {
          delete newMap[email]; // Remove rate limit when expired
          updated = true;
        }
      });
      
      if (updated) {
        setRateLimitMap(newMap);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [rateLimitMap]);
  
  // Calculate remaining cooldown time for current email
  const getRemainingCooldown = () => {
    if (!email || !rateLimitMap[email]) return 0;
    
    const now = Date.now();
    const data = rateLimitMap[email];
    const elapsed = now - data.timestamp;
    const remaining = Math.max(0, data.cooldown - elapsed);
    
    return Math.ceil(remaining / 1000);
  };

  return (
    <main className="min-h-screen bg-[url('https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80')] bg-cover bg-center bg-no-repeat">
      <div className="min-h-screen bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <GameController className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Game Studio Tracker</CardTitle>
            <CardDescription>
              {isSignUp ? "Create an account to get started" : "Sign in to manage your game development projects"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAuth}>
            <CardContent className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isSignUp}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                {isSignUp && (
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span>Password Strength</span>
                      <span>{passwordStrength}%</span>
                    </div>
                    <Progress value={passwordStrength} className={getPasswordStrengthColor()} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use 8+ characters with a mix of letters, numbers & symbols
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                className="w-full" 
                type="submit" 
                disabled={isLoading || (email && rateLimitMap[email]?.cooldown > 0)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignUp ? "Creating account..." : "Signing in..."}
                  </>
                ) : (email && rateLimitMap[email]?.cooldown > 0) ? (
                  `Rate limited - wait ${getRemainingCooldown()} seconds...`
                ) : (
                  isSignUp ? "Create Account" : "Sign In"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}