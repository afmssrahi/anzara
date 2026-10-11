import { OrderDetailView } from './order-detail-view';

export const dynamic = 'force-dynamic';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  return <OrderDetailView orderId={params.id} />;
}
