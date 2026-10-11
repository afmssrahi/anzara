/**
 * Manual courier provider.
 *
 * Free, in-process. The admin types a tracking number into the order
 * detail form; we just persist whatever they wrote. When Pathao /
 * Steadfast / RedX integrations land, this remains the fallback for
 * orders that are dispatched outside the platform.
 */
import { BadRequestError } from '../../lib/errors';
import type { CourierProvider, DispatchContext, DispatchResult } from './provider';

export const manualCourierProvider: CourierProvider = {
  id: 'manual',
  label: 'Manual (admin-entered tracking)',

  async dispatchOrder(
    _ctx: DispatchContext,
    args: { trackingNumber?: string; notes?: string },
  ): Promise<DispatchResult> {
    const tn = (args.trackingNumber ?? '').trim();
    if (!tn) {
      throw new BadRequestError(
        'Manual courier dispatch requires a tracking number. ' +
          'Type the courier + tracking number into the order detail form.',
      );
    }
    // For the note "notes" the admin typed in the form, we attach it as a
    // ShipmentEvent. The caller handles persistence; this provider only
    // returns the resulting tracking number.
    void args.notes;
    return { trackingNumber: tn };
  },

  async cancelDispatch(_ctx: DispatchContext, _reason: string): Promise<void> {
    // No external system to cancel. The caller should mark the Shipment
    // row as CANCELLED in DB and add a ShipmentEvent for the audit trail.
  },
};
