import { MailerService } from './mailer.service';

describe('MailerService', () => {
  const mailer = new MailerService();

  const event = {
    id: 'evt_1',
    title: 'Team sync',
    startAt: new Date('2026-07-19T12:30:00.000Z'),
    endAt: new Date('2026-07-19T13:00:00.000Z'),
    location: 'Room 4',
  };

  it('sendReminder sends and returns true', async () => {
    const result = await mailer.sendReminder(event, 'owner@example.com', {
      amount: 30,
      unit: 'minutes',
    });
    expect(result).toBe(true);
  });

  it('sendInvitation still works after the deliver() refactor', async () => {
    const result = await mailer.sendInvitation(
      { id: event.id, title: event.title },
      'guest@example.com',
      'tok_123',
    );
    expect(result).toBe(true);
  });
});
