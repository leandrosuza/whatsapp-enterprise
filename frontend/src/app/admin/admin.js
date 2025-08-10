// Admin Panel JavaScript - WhatsApp Enterprise

// Enhanced Toggle functionality for WhatsApp number cards
function initializeToggles() {
  document.querySelectorAll('.toggle-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const cardHeader = this.closest('.whatsapp-gradient');
      const statusDot = cardHeader.querySelector('span.bg-green-400, span.bg-gray-400');
      const card = this.closest('.card-enhanced');
      
      // Add loading state
      card.classList.add('loading-spinner');
      
      setTimeout(() => {
        if (this.checked) {
          statusDot.classList.remove('bg-gray-400');
          statusDot.classList.add('bg-green-400', 'status-online');
          
          const statusText = cardHeader.querySelector('p.text-xs');
          statusText.textContent = 'Active now';
          statusText.classList.add('text-green-400');
          
          // Add success animation
          card.classList.add('bounce-in');
          showNotification('WhatsApp number activated successfully!', 'success');
        } else {
          statusDot.classList.remove('bg-green-400', 'status-online');
          statusDot.classList.add('bg-gray-400');
          
          const statusText = cardHeader.querySelector('p.text-xs');
          statusText.textContent = 'Inactive';
          statusText.classList.remove('text-green-400');
          
          showNotification('WhatsApp number deactivated', 'info');
        }
        
        card.classList.remove('loading-spinner');
        
        // Remove animation class after animation completes
        setTimeout(() => {
          card.classList.remove('bounce-in');
        }, 600);
      }, 500);
    });
  });
}

// Enhanced Mobile menu toggle functionality
function initializeMobileMenu() {
  const mobileMenuButton = document.querySelector('.md\\:hidden');
  const sidebar = document.querySelector('.hidden.md\\:flex');
  const overlay = document.querySelector('.mobile-overlay');
  
  if (mobileMenuButton && sidebar) {
    mobileMenuButton.addEventListener('click', function() {
      sidebar.classList.toggle('mobile-sidebar');
      sidebar.classList.toggle('open');
      
      // Create overlay if it doesn't exist
      if (!overlay) {
        const newOverlay = document.createElement('div');
        newOverlay.className = 'mobile-overlay';
        document.body.appendChild(newOverlay);
        
        newOverlay.addEventListener('click', function() {
          sidebar.classList.remove('open');
          newOverlay.classList.remove('open');
        });
      } else {
        overlay.classList.toggle('open');
      }
    });
  }
  
  // Close menu on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    }
  });
}

// Filter functionality for recent activities
function initializeFilters() {
  const filterSelect = document.getElementById('filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', function() {
      const filterValue = this.value;
      console.log('Filter changed to:', filterValue);
      // Filter logic implementation would go here
      filterActivities(filterValue);
    });
  }
}

// Filter activities based on selected number
function filterActivities(filterValue) {
  const activities = document.querySelectorAll('.activity-item');
  
  activities.forEach(activity => {
    if (filterValue === 'all') {
      activity.style.display = 'block';
    } else {
      const activityNumber = activity.getAttribute('data-number');
      if (activityNumber === filterValue) {
        activity.style.display = 'block';
      } else {
        activity.style.display = 'none';
      }
    }
  });
}

// Notification system
function initializeNotifications() {
  const notificationButton = document.querySelector('.notification-button');
  if (notificationButton) {
    notificationButton.addEventListener('click', function() {
      // Notification dropdown logic
      toggleNotificationDropdown();
    });
  }
}

function toggleNotificationDropdown() {
  const dropdown = document.querySelector('.notification-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

// Real-time updates simulation
function initializeRealTimeUpdates() {
  setInterval(() => {
    updateStats();
  }, 30000); // Update every 30 seconds
}

function updateStats() {
  // Simulate real-time stats updates
  const statsElements = document.querySelectorAll('.stats-value');
  statsElements.forEach(element => {
    const currentValue = parseInt(element.textContent.replace(/,/g, ''));
    const newValue = currentValue + Math.floor(Math.random() * 5);
    element.textContent = newValue.toLocaleString();
  });
}

// Card interactions
function initializeCardInteractions() {
  const cards = document.querySelectorAll('.whatsapp-card');
  cards.forEach(card => {
    card.addEventListener('click', function(e) {
      if (!e.target.closest('button')) {
        // Navigate to detailed view
        const numberId = this.getAttribute('data-number-id');
        navigateToNumberDetail(numberId);
      }
    });
  });
}

function navigateToNumberDetail(numberId) {
  // Navigation logic to detailed view
  console.log('Navigating to number detail:', numberId);
  // window.location.href = `/admin/numbers/${numberId}`;
}

// Search functionality
function initializeSearch() {
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      filterCards(searchTerm);
    });
  }
}

function filterCards(searchTerm) {
  const cards = document.querySelectorAll('.whatsapp-card');
  cards.forEach(card => {
    const number = card.querySelector('.number-text').textContent.toLowerCase();
    const name = card.querySelector('.name-text')?.textContent.toLowerCase() || '';
    
    if (number.includes(searchTerm) || name.includes(searchTerm)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// Enhanced Notification System
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification-toast notification-${type} fade-in`;
  notification.innerHTML = `
    <div class="flex items-center p-4 rounded-lg shadow-lg">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-3 text-${type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'}-500"></i>
      <span class="text-white">${message}</span>
      <button class="ml-auto text-white hover:text-gray-300" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    max-width: 400px;
    background: ${type === 'success' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 
                 type === 'error' ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : 
                 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'};
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Enhanced Search with Debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Enhanced Card Interactions with Hover Effects
function initializeCardInteractions() {
  const cards = document.querySelectorAll('.whatsapp-card, .card-enhanced');
  cards.forEach(card => {
    // Add hover effects
    card.addEventListener('mouseenter', function() {
      this.classList.add('hover-lift');
    });
    
    card.addEventListener('mouseleave', function() {
      this.classList.remove('hover-lift');
    });
    
    // Click to navigate
    card.addEventListener('click', function(e) {
      if (!e.target.closest('button, .toggle-checkbox')) {
        const numberId = this.getAttribute('data-number-id');
        if (numberId) {
          navigateToNumberDetail(numberId);
        }
      }
    });
  });
}

// Enhanced Progress Bars
function initializeProgressBars() {
  const progressBars = document.querySelectorAll('.progress-enhanced');
  progressBars.forEach(bar => {
    const progressBar = bar.querySelector('.progress-bar-enhanced');
    if (progressBar) {
      const targetWidth = progressBar.getAttribute('data-progress') || '0';
      progressBar.style.width = '0%';
      
      setTimeout(() => {
        progressBar.style.width = targetWidth + '%';
      }, 500);
    }
  });
}

// Enhanced Tooltips
function initializeTooltips() {
  const tooltipElements = document.querySelectorAll('.tooltip-enhanced');
  tooltipElements.forEach(element => {
    element.addEventListener('mouseenter', function() {
      const tooltip = this.getAttribute('data-tooltip');
      if (tooltip) {
        showTooltip(this, tooltip);
      }
    });
    
    element.addEventListener('mouseleave', function() {
      hideTooltip();
    });
  });
}

function showTooltip(element, text) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip-popup';
  tooltip.textContent = text;
  tooltip.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  document.body.appendChild(tooltip);
  
  const rect = element.getBoundingClientRect();
  tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
  tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
  
  setTimeout(() => {
    tooltip.style.opacity = '1';
  }, 10);
  
  element._tooltip = tooltip;
}

function hideTooltip() {
  const tooltip = document.querySelector('.tooltip-popup');
  if (tooltip) {
    tooltip.style.opacity = '0';
    setTimeout(() => tooltip.remove(), 300);
  }
}

// Enhanced Table Interactions
function initializeTableInteractions() {
  const tables = document.querySelectorAll('.table-enhanced');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      row.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(37, 211, 102, 0.05)';
      });
      
      row.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '';
      });
    });
  });
}

// Enhanced Form Validation
function initializeFormValidation() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const requiredFields = form.querySelectorAll('[required]');
      let isValid = true;
      
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          field.classList.add('border-red-500');
          isValid = false;
        } else {
          field.classList.remove('border-red-500');
        }
      });
      
      if (!isValid) {
        e.preventDefault();
        showNotification('Please fill in all required fields', 'error');
      }
    });
  });
}

// Enhanced Keyboard Shortcuts
function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector('.search-input');
      if (searchInput) {
        searchInput.focus();
      }
    }
    
    // Ctrl/Cmd + N for new conversation
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      // Navigate to new conversation
      console.log('New conversation shortcut');
    }
  });
}

// Enhanced Loading States
function showLoading(element, text = 'Loading...') {
  const loading = document.createElement('div');
  loading.className = 'loading-overlay';
  loading.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner w-8 h-8"></div>
      <p class="text-white mt-2">${text}</p>
    </div>
  `;
  loading.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: inherit;
    z-index: 10;
  `;
  
  element.style.position = 'relative';
  element.appendChild(loading);
}

function hideLoading(element) {
  const loading = element.querySelector('.loading-overlay');
  if (loading) {
    loading.remove();
  }
}

// Export functions for use in components
export {
  initializeToggles,
  initializeMobileMenu,
  initializeFilters,
  initializeNotifications,
  initializeRealTimeUpdates,
  initializeCardInteractions,
  initializeSearch,
  showNotification,
  showLoading,
  hideLoading
};

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeToggles();
  initializeMobileMenu();
  initializeFilters();
  initializeNotifications();
  initializeRealTimeUpdates();
  initializeCardInteractions();
  initializeSearch();
  initializeProgressBars();
  initializeTooltips();
  initializeTableInteractions();
  initializeFormValidation();
  initializeKeyboardShortcuts();
  
  // Add smooth scrolling
  document.documentElement.style.scrollBehavior = 'smooth';
  
  // Initialize intersection observer for animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
      }
    });
  }, observerOptions);
  
  // Observe all cards and sections
  document.querySelectorAll('.card-enhanced, .whatsapp-card, section').forEach(el => {
    observer.observe(el);
  });
}); 