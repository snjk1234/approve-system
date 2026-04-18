'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { User } from '@supabase/supabase-js';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SubscriptionWithPriceAndProduct } from '@/utils/types';

enum PopularPlanType {
  NO = 0,
  YES = 1
}

interface PricingTier {
  title: string;
  popular: PopularPlanType;
  fallbackPrice: number;
  description: string;
  buttonText: string;
  benefitList: string[];
  redirectURL?: string;
}

// Static tier configuration - prices are fetched from database
const pricingTiers: PricingTier[] = [
  {
    title: 'Free',
    popular: 0,
    fallbackPrice: 0,
    description:
      'Lorem ipsum dolor sit, amet ipsum consectetur adipisicing elit.',
    buttonText: 'Get Started',
    benefitList: [
      '1 Team member',
      '2 GB Storage',
      'Up to 4 pages',
      'Community support',
      'lorem ipsum dolor'
    ],
    redirectURL: '/account'
  },
  {
    title: 'Hobby',
    popular: 1,
    fallbackPrice: 10,
    description:
      'Lorem ipsum dolor sit, amet ipsum consectetur adipisicing elit.',
    buttonText: 'Subscribe Now',
    benefitList: [
      '4 Team member',
      '4 GB Storage',
      'Upto 6 pages',
      'Priority support',
      'lorem ipsum dolor'
    ]
  },
  {
    title: 'Freelancer',
    popular: 0,
    fallbackPrice: 20,
    description:
      'Lorem ipsum dolor sit, amet ipsum consectetur adipisicing elit.',
    buttonText: 'Subscribe Now',
    benefitList: [
      '10 Team member',
      '8 GB Storage',
      'Upto 10 pages',
      'Priority support',
      'lorem ipsum dolor'
    ]
  }
];

interface ProductWithPrices {
  id: string;
  name: string | null;
  prices: {
    id: string;
    unit_amount: number | null;
    currency: string | null;
    active: boolean | null;
  }[];
}

export const Pricing = ({
  user,
  subscription
}: {
  user: User | null;
  subscription: SubscriptionWithPriceAndProduct | null;
}) => {
  const hasActiveSubscription =
    subscription?.status === 'active' || subscription?.status === 'trialing';
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const getStripePrice = (tier: PricingTier): number => tier.fallbackPrice;

  const handleClick = async (tier: PricingTier) => {
    if (tier.redirectURL) {
      return router.push(tier.redirectURL);
    }
    return router.push('/auth/signup');
  };

  return (
    <Section
      id="pricing"
      className="relative overflow-hidden"
    >
      <div className="max-w-container mx-auto">
        <h2 className="text-center text-3xl leading-tight font-semibold sm:text-5xl sm:leading-tight">
          Get Unlimited Access
        </h2>
        <p className="text-xl text-center text-muted-foreground pt-4 pb-8">
          Choose the plan that works for you.
        </p>
        {hasActiveSubscription ? (
          <div className="flex justify-center items-center gap-4 pb-8">
            <span className="text-sm font-medium text-muted-foreground">
              You have an active subscription
            </span>
          </div>
        ) : null}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pricingTiers.map((tier: PricingTier) => (
            <Card
              key={tier.title}
              className={`glass-4 ${tier.popular === PopularPlanType.YES
                  ? 'drop-shadow-xl shadow-black/10 dark:shadow-white/10'
                  : ''
                }`}
            >
              <CardHeader>
                <CardTitle className="flex item-center justify-between">
                  {tier.title}
                  {tier.popular === PopularPlanType.YES ? (
                    <Badge
                      variant="secondary"
                      className="text-sm text-primary"
                    >
                      Most popular
                    </Badge>
                  ) : null}
                </CardTitle>
                <div>
                  <>
                    <span className="text-3xl font-bold">
                      ${getStripePrice(tier)}
                    </span>
                    <span className="text-muted-foreground"> /month</span>
                  </>
                </div>

                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleClick(tier)}
                  disabled={loading}
                >
                  {tier.buttonText}
                </Button>
              </CardContent>

              <hr className="w-4/5 m-auto mb-4" />

              <CardFooter className="flex">
                <div className="space-y-4">
                  {tier.benefitList.map((benefit: string) => (
                    <span key={benefit} className="flex">
                      <Check className="text-green-500" />{' '}
                      <h3 className="ml-2">{benefit}</h3>
                    </span>
                  ))}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </Section>
  );
};
