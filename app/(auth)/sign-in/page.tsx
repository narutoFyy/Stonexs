import { Suspense } from 'react';
import AuthCard from '@/components/auth-card';

function SignInContent() {
  return (
    <AuthCard
      title="登录"
      description="使用 yf-mail.com 账号继续。"
      mode="sign-in"
    />
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
