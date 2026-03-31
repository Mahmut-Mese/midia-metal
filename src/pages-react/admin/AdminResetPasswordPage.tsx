import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Seo from '../../components/Seo';

const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ['password_confirmation'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function AdminResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: email || '',
      password: '',
      password_confirmation: '',
    },
  });

  useEffect(() => {
    if (!token) {
      toast.error('Invalid password reset link.');
      navigate('/admin/login');
    }
  }, [token, navigate]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await apiFetch('/admin/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          token,
        }),
      });

      toast.success('Password reset successfully! You can now log in.');
      navigate('/admin/login');
    } catch (error: any) {
      if (error.status === 422 && error.data?.email) {
        form.setError('email', { message: error.data.email });
      } else {
        toast.error('Failed to reset password. The link might be expired.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Seo title="Admin Reset Password" description="Reset your admin account password." canonicalPath="/admin/reset-password" noindex />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/">
          <img className="mx-auto h-16 w-auto" src="/logo.png" alt="Midia Metal" />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          Create New Admin Password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        readOnly
                        className="bg-slate-50 cursor-not-allowed"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password_confirmation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-10"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
