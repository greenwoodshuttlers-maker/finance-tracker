// ---------- CARD BILL ENGINE ----------

// Calculates billing cycle and total spend for each card

export const calculateCardBills = (transactions, cards) => {

  const result = [];

  cards.forEach(card => {

    const cycleDay = Number(card.billingCycleDay);

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), cycleDay);

    let cycleStart = start;
    let cycleEnd;

    if (today.getDate() < cycleDay) {

      cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, cycleDay);
      cycleEnd = new Date(today.getFullYear(), today.getMonth(), cycleDay - 1);

    } else {

      cycleEnd = new Date(today.getFullYear(), today.getMonth() + 1, cycleDay - 1);

    }

    let total = 0;

    transactions.forEach(t => {

      if (
        t.transactionType === "Credit Card" &&
        t.cardName === card.cardName
      ) {

        const d = new Date(t.date);

        if (d >= cycleStart && d <= cycleEnd) {
          total += Number(t.amount || 0);
        }

      }

    });

    result.push({
      cardName: card.cardName,
      totalSpend: total,
      cycleStart,
      cycleEnd,
      limit: card.limit || 0
    });

  });

  return result;

};