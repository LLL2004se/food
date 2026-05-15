// Notification Service for delivery proximity alerts

export const NotificationService = {
  // Request browser notification permission
  requestPermission: async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    }
    return false;
  },

  // Send notification when delivery is nearby
  notifyDeliveryNearby: (distance, volunteerName) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚴 Delivery Incoming!', {
        body: `${volunteerName} is ${distance} km away with your food donation`,
        icon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-blue.png',
        tag: 'delivery-nearby',
        requireInteraction: true
      });
    }
  },

  // Send notification when delivery arrives
  notifyDeliveryArrived: (volunteerName) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('✓ Delivery Arrived!', {
        body: `${volunteerName} has arrived with your donation`,
        icon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-green.png',
        tag: 'delivery-arrived',
        requireInteraction: true
      });
    }
  }
};
