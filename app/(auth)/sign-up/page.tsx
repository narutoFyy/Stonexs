import { Suspense } from 'react';
import AuthCard from '@/components/auth-card';

function SignUpContent() {
  return (
    <AuthCard
      title="注册账号"
      description="注册由 yf-mail.com 统一完成，余额和账号信息将自动同步。"
      mode="sign-up"
    />
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}
