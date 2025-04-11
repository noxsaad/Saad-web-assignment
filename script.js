$(document).ready(() => {
  console.log("Website Loaded with jQuery")

  // Add these variables at the top of the $(document).ready() function, after the console.log line
  let currentUser = null

  // Check if user is already logged in (from localStorage)
  const storedUser = localStorage.getItem("currentUser")
  if (storedUser) {
    currentUser = JSON.parse(storedUser)
    updateUIAfterLogin()
  } else {
    // Hide chat button if not logged in
    $(".chat-box").hide()
  }

  // ===== DOM Manipulation & jQuery Effects =====

  // Animate the hero section on load
  $("#hero").hide().fadeIn(1000)

  // Add hover effects to cards
  $(".card").hover(
    function () {
      $(this).animate({ marginTop: "-10px" }, 200)
    },
    function () {
      $(this).animate({ marginTop: "0px" }, 200)
    },
  )

  // ===== AJAX & JSON - Load Live Stats =====
  function loadStats() {
    $.ajax({
      url: "data/stats.json",
      type: "GET",
      dataType: "json",
      success: (data) => {
        // Use jQuery to update the DOM with the stats data
        $("#activeTournaments").text(data.activeTournaments).addClass("text-success")
        $("#registeredTeams").text(data.registeredTeams).addClass("text-info")
        $("#totalPrizeMoney").text(data.totalPrizeMoney).addClass("text-warning")
        $("#upcomingMatches").text(data.upcomingMatches).addClass("text-danger")

        // Animate the numbers counting up
        $(".card-text").each(function () {
          $(this)
            .prop("Counter", 0)
            .animate(
              {
                Counter: $(this)
                  .text()
                  .replace(/[^0-9]/g, ""),
              },
              {
                duration: 2000,
                easing: "swing",
                step: function (now) {
                  // Format with currency symbol if needed
                  if ($(this).attr("id") === "totalPrizeMoney") {
                    $(this).text("$" + Math.ceil(now).toLocaleString())
                  } else {
                    $(this).text(Math.ceil(now).toLocaleString())
                  }
                },
              },
            )
        })
      },
      error: (xhr, status, error) => {
        console.error("Error loading stats:", error)
        showNotification("Error", "Could not load statistics data", "error")
      },
    })
  }

  // ===== AJAX & JSON - Load Tournaments =====
  let visibleTournaments = 3 // Initial number of tournaments to show
  let allTournaments = [] // Store all tournaments

  function loadTournaments() {
    $.ajax({
      url: "data/tournaments.json",
      type: "GET",
      dataType: "json",
      success: (data) => {
        allTournaments = data.tournaments
        displayTournaments(allTournaments.slice(0, visibleTournaments))

        // Show notification
        showNotification("Success", "Tournaments loaded successfully!", "success")
      },
      error: (xhr, status, error) => {
        console.error("Error loading tournaments:", error)
        showNotification("Error", "Could not load tournament data", "error")
        $("#tournamentList").html(
          "<div class='col-12 text-center'><p>Error loading tournaments. Please try again later.</p></div>",
        )
      },
    })
  }

  function displayTournaments(tournaments) {
    let html = ""

    if (tournaments.length === 0) {
      html = "<div class='col-12 text-center'><p>No tournaments found matching your criteria.</p></div>"
    } else {
      tournaments.forEach((tournament) => {
        const isFull = tournament.registeredTeams >= tournament.maxTeams
        const statusClass = isFull ? "text-danger" : "text-success"
        const statusText = isFull ? "Full" : "Open for Registration"

        html += `
          <div class="col-md-4 mb-4 tournament-card" data-status="${isFull ? "full" : "available"}">
            <div class="card h-100">
              <div class="position-relative">
                <img src="${tournament.image}" class="card-img-top" alt="${tournament.title}" width="100" height="300">
                <span class="position-absolute top-0 end-0 badge ${isFull ? "bg-danger" : "bg-success"} m-2">
                  ${statusText}
                </span>
              </div>
              <div class="card-body">
                <h5 class="card-title"><i class="bi ${tournament.icon}"></i> ${tournament.title}</h5>
                <p class="card-text">${tournament.description}</p>
                <div class="d-flex justify-content-between mb-2">
                  <small><i class="bi bi-calendar"></i> ${tournament.date}</small>
                  <small><i class="bi bi-cash"></i> ${tournament.prize}</small>
                </div>
                <div class="progress mb-3" style="height: 20px;">
                  <div class="progress-bar ${isFull ? "bg-danger" : "bg-success"}" role="progressbar" 
                    style="width: ${(tournament.registeredTeams / tournament.maxTeams) * 100}%;" 
                    aria-valuenow="${tournament.registeredTeams}" aria-valuemin="0" aria-valuemax="${tournament.maxTeams}">
                    ${tournament.registeredTeams}/${tournament.maxTeams} Teams
                  </div>
                </div>
                <button class="btn btn-primary w-100 tournament-register" data-id="${tournament.id}" ${isFull ? "disabled" : ""}>
                  <i class="bi bi-pencil-square"></i> ${isFull ? "Registration Closed" : "Register Now"}
                </button>
              </div>
            </div>
          </div>
        `
      })
    }

    $("#tournamentList").html(html)

    // Add click event to register buttons
    $(".tournament-register").click(function () {
      // Check if user is logged in
      if (!currentUser) {
        showNotification("Error", "Please log in to register for tournaments", "error")
        // Open login modal
        const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
        loginModal.show()
        return
      }

      const tournamentId = $(this).data("id")
      const tournament = allTournaments.find((t) => t.id === tournamentId)

      // Show registration modal (we'll create this with DOM manipulation)
      showRegistrationModal(tournament)
    })

    // Add animation to the cards
    $(".tournament-card").each(function (index) {
      $(this)
        .hide()
        .delay(index * 200)
        .fadeIn(500)
    })
  }

  // Load more tournaments button
  $("#loadMoreBtn").click(function () {
    visibleTournaments += 3
    if (visibleTournaments >= allTournaments.length) {
      $(this).prop("disabled", true).text("All Tournaments Loaded")
    }

    // Get current filter
    const currentFilter = $(".btn-group button.active").data("filter")
    filterTournaments(currentFilter)
  })

  // Filter tournaments
  $(".btn-group button").click(function () {
    $(".btn-group button").removeClass("active")
    $(this).addClass("active")

    const filter = $(this).data("filter")
    filterTournaments(filter)
  })

  function filterTournaments(filter) {
    let filteredTournaments = allTournaments

    if (filter === "available") {
      filteredTournaments = allTournaments.filter((t) => t.registeredTeams < t.maxTeams)
    } else if (filter === "full") {
      filteredTournaments = allTournaments.filter((t) => t.registeredTeams >= t.maxTeams)
    }

    // Apply search filter if there's text in the search box
    const searchText = $("#tournamentSearch").val().toLowerCase()
    if (searchText) {
      filteredTournaments = filteredTournaments.filter(
        (t) => t.title.toLowerCase().includes(searchText) || t.description.toLowerCase().includes(searchText),
      )
    }

    displayTournaments(filteredTournaments.slice(0, visibleTournaments))
  }

  // Search tournaments
  $("#tournamentSearch").on("input", () => {
    const currentFilter = $(".btn-group button.active").data("filter")
    filterTournaments(currentFilter)
  })

  // ===== DOM Manipulation - Create Registration Modal =====
  function showRegistrationModal(tournament) {
    // Remove existing modal if any
    $("#registrationModal").remove()

    // Create modal with DOM manipulation
    const modal = document.createElement("div")
    modal.className = "modal fade"
    modal.id = "registrationModal"
    modal.tabIndex = "-1"
    modal.setAttribute("aria-labelledby", "registrationModalLabel")
    modal.setAttribute("aria-hidden", "true")

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="registrationModalLabel">Register for ${tournament.title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="registrationForm">
              <div class="mb-3">
                <label for="teamName" class="form-font">Team Name</label>
                <input type="text" class="form-control" id="teamName" required>
              </div>
              <div class="mb-3">
                <label for="teamEmail" class="form-font">Email Contact</label>
                <input type="email" class="form-control" id="teamEmail" value="${currentUser ? currentUser.email : ""}" required>
              </div>
              <div class="mb-3">
                <label for="teamSize" class="form-font">Number of Players</label>
                <select class="form-select" id="teamSize" required>
                  <option value="">Select Team Size</option>
                  <option value="1">1 (Solo)</option>
                  <option value="2">2 (Duo)</option>
                  <option value="3">3 (Trio)</option>
                  <option value="4">4 (Squad)</option>
                  <option value="5">5 (Full Team)</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="teamComments" class="form-font">Additional Comments</label>
                <textarea class="form-control" id="teamComments" rows="3"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="submitRegistration">Submit Registration</button>
          </div>
        </div>
      </div>
    `

    // Append modal to body
    document.body.appendChild(modal)

    // Show the modal
    const modalInstance = new bootstrap.Modal(modal)
    modalInstance.show()

    // Handle registration submission
    $("#submitRegistration").click(function () {
      const teamName = $("#teamName").val()
      const teamEmail = $("#teamEmail").val()
      const teamSize = $("#teamSize").val()

      if (!teamName || !teamEmail || !teamSize) {
        showNotification("Error", "Please fill all required fields", "error")
        return
      }

      // Simulate AJAX registration
      $(this).html(
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...',
      )
      $(this).prop("disabled", true)

      setTimeout(() => {
        modalInstance.hide()
        showNotification("Success", `Team ${teamName} registered for ${tournament.title}!`, "success")

        // Update the tournament's registered teams count
        const tournamentIndex = allTournaments.findIndex((t) => t.id === tournament.id)
        if (tournamentIndex !== -1) {
          allTournaments[tournamentIndex].registeredTeams++

          // Refresh the display
          const currentFilter = $(".btn-group button.active").data("filter")
          filterTournaments(currentFilter)
        }
      }, 1500)
    })
  }

  // ===== AJAX & JSON - Load Reviews =====
  function loadReviews() {
    $.ajax({
      url: "data/tournaments.json",
      type: "GET",
      dataType: "json",
      success: (data) => {
        const reviews = data.reviews
        let carouselItems = ""

        reviews.forEach((review, index) => {
          const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating)

          carouselItems += `
            <div class="carousel-item ${index === 0 ? "active" : ""}">
              <div class="card">
                <div class="card-body text-center">
                  <h5 class="card-title">${review.name}</h5>
                  <div class="text-warning mb-2">${stars}</div>
                  <p class="card-text">"${review.comment}"</p>
                  <small class="text-muted">${review.date}</small>
                </div>
              </div>
            </div>
          `
        })

        $("#reviewsCarousel .carousel-inner").html(carouselItems)
      },
      error: (xhr, status, error) => {
        console.error("Error loading reviews:", error)
        $("#reviewsCarousel .carousel-inner").html(`
          <div class="carousel-item active">
            <div class="card">
              <div class="card-body text-center">
                <h5 class="card-title">Error loading reviews</h5>
                <p class="card-text">Please try again later.</p>
              </div>
            </div>
          </div>
        `)
      },
    })
  }

  // Handle review submission
  $("#reviewForm").submit(function (e) {
    e.preventDefault()

    // Check if user is logged in
    if (!currentUser) {
      showNotification("Error", "Please log in to submit a review", "error")
      // Open login modal
      const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
      loginModal.show()
      return
    }

    const name = $("#reviewName").val()
    const rating = $("#reviewRating").val()
    const comment = $("#reviewComment").val()

    if (!name || !rating || !comment) {
      showNotification("Error", "Please fill all fields", "error")
      return
    }

    // Simulate AJAX submission
    const submitBtn = $(this).find("button[type='submit']")
    submitBtn.html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...',
    )
    submitBtn.prop("disabled", true)

    setTimeout(() => {
      // Create a new review and add it to the carousel
      const newReview = {
        id: Date.now(),
        name: name,
        rating: Number.parseInt(rating),
        comment: comment,
        date: new Date().toISOString().split("T")[0],
      }

      const stars = "★".repeat(newReview.rating) + "☆".repeat(5 - newReview.rating)

      const newCarouselItem = `
        <div class="carousel-item active">
          <div class="card">
            <div class="card-body text-center">
              <h5 class="card-title">${newReview.name}</h5>
              <div class="text-warning mb-2">${stars}</div>
              <p class="card-text">"${newReview.comment}"</p>
              <small class="text-muted">${newReview.date}</small>
            </div>
          </div>
        </div>
      `

      // Make all items inactive and add the new one
      $("#reviewsCarousel .carousel-item").removeClass("active")
      $("#reviewsCarousel .carousel-inner").prepend(newCarouselItem)

      // Reset form
      $("#reviewForm")[0].reset()
      submitBtn.html('<i class="bi bi-send"></i> Submit Review')
      submitBtn.prop("disabled", false)

      showNotification("Success", "Your review has been submitted!", "success")
    }, 1500)
  })

  // ===== Chat Functionality =====
  const sendMessageBtn = $("#sendMessageBtn")
  const chatInput = $("#chatInput")
  const chatMessages = $("#chatMessages")
  const needHelpBtn = $("#needHelpBtn")
  const chatModalElement = $("#chatModal")

  // Function to add a message to the chat
  function addMessage(message, isSent = true) {
    if (!chatMessages.length) return

    const messageDiv = $("<div>")
      .addClass("message")
      .addClass(isSent ? "sent" : "received")
    const messageContent = $("<div>").addClass("message-content").text(message)
    const messageTime = $("<div>")
      .addClass("message-time")
      .text(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      )

    messageDiv.append(messageContent, messageTime)
    chatMessages.append(messageDiv)
    chatMessages.scrollTop(chatMessages[0].scrollHeight)

    if (isSent) {
      setTimeout(simulateResponse, 1000)
    }
  }

  // Function to simulate a response
  function simulateResponse() {
    const responses = [
      "How can I help you with tournament registration?",
      "Would you like to know more about our upcoming events?",
      "I'm here to assist with any questions about our esports tournaments.",
      "Is there anything specific you'd like help with?",
      "Feel free to ask about our games or registration process!",
    ]
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    addMessage(randomResponse, false)
  }

  // Function to send a message
  function sendMessage() {
    if (!chatInput.length) return

    const message = chatInput.val().trim()
    if (message !== "") {
      addMessage(message, true)
      chatInput.val("")
    }
  }

  // Add click event listener to send message button
  sendMessageBtn.click((e) => {
    e.preventDefault()
    sendMessage()
  })

  // Allow pressing "Enter" to send messages
  chatInput.keypress((e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      sendMessage()
    }
  })

  // Add initial welcome message when chat is opened
  chatModalElement.on("shown.bs.modal", () => {
    console.log("Modal is now visible")
    chatInput.focus()

    // Clear previous messages and add welcome message
    if (chatMessages.children().length === 0) {
      addMessage(
        `Welcome ${currentUser ? currentUser.name : ""} to Esports Manager support! How can I help you today?`,
        false,
      )
    }
  })

  // ===== Notification System =====
  function showNotification(title, message, type = "info") {
    const toast = $("#notificationToast")
    const toastTitle = $("#toastTitle")
    const toastMessage = $("#toastMessage")
    const toastTime = $("#toastTime")

    // Set content
    toastTitle.text(title)
    toastMessage.text(message)
    toastTime.text(new Date().toLocaleTimeString())

    // Set color based on type
    toast.removeClass("bg-success bg-danger bg-info")
    if (type === "success") {
      toastTitle.prepend('<i class="bi bi-check-circle me-2"></i>')
      toast.addClass("bg-success text-white")
    } else if (type === "error") {
      toastTitle.prepend('<i class="bi bi-exclamation-triangle me-2"></i>')
      toast.addClass("bg-danger text-white")
    } else {
      toastTitle.prepend('<i class="bi bi-info-circle me-2"></i>')
      toast.addClass("bg-info text-white")
    }

    // Show the toast
    const toastInstance = new bootstrap.Toast(toast)
    toastInstance.show()
  }

  // ===== Login Functionality =====
  // Create a users array for demo purposes
  const users = [
    {
      id: 1,
      username: "user1",
      password: "password1",
      email: "user1@example.com",
      name: "John Doe",
    },
    {
      id: 2,
      username: "user2",
      password: "password2",
      email: "user2@example.com",
      name: "Jane Smith",
    },
    {
      id: 3,
      username: "admin",
      password: "admin123",
      email: "admin@example.com",
      name: "Admin User",
    },
  ]

  function handleLogin(username, password) {
    // Find user
    const user = users.find((u) => u.username === username && u.password === password)

    if (user) {
      // Login successful
      currentUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      }

      // Store in localStorage
      localStorage.setItem("currentUser", JSON.stringify(currentUser))

      // Update UI
      updateUIAfterLogin()

      // Close modal
      const loginModalInstance = bootstrap.Modal.getInstance(document.getElementById("loginModal"))
      loginModalInstance.hide()

      showNotification("Success", `Welcome back, ${currentUser.name}!`, "success")
    } else {
      // Login failed
      $("#loginError").text("Invalid username or password").show()
    }
  }

  function handleLogout() {
    // Clear user data
    currentUser = null
    localStorage.removeItem("currentUser")

    // Update UI
    updateUIAfterLogout()

    showNotification("Info", "You have been logged out", "info")
  }

  function updateUIAfterLogin() {
    // Show user info in navbar
    $(".nav-item.login-btn").html(`
      <div class="dropdown">
        <a class="nav-link dropdown-toggle" href="#" role="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-person-circle"></i> ${currentUser.name}
        </a>
        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
          <li><a class="dropdown-item" href="#"><i class="bi bi-person"></i> Profile</a></li>
          <li><a class="dropdown-item" href="#"><i class="bi bi-gear"></i> Settings</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Logout</a></li>
        </ul>
      </div>
    `)

    // Add logout handler
    $("#logoutBtn").click((e) => {
      e.preventDefault()
      handleLogout()
    })

    // Show chat button
    $(".chat-box").fadeIn(500)
  }

  function updateUIAfterLogout() {
    // Restore login button
    $(".nav-item.login-btn").html(`
      <a class="nav-link btn btn-outline-light login-btn" href="#" data-bs-toggle="modal" data-bs-target="#loginModal">
        <i class="bi bi-person-fill"></i> Login
      </a>
    `)

    // Hide chat button
    $(".chat-box").fadeOut(500)
  }

  // Login form submission
  $("#loginForm").submit((e) => {
    e.preventDefault()
    const username = $("#loginUsername").val()
    const password = $("#loginPassword").val()

    if (!username || !password) {
      $("#loginError").text("Please enter both username and password").show()
      return
    }

    handleLogin(username, password)
  })

  // Registration form submission
  $("#registerForm").submit((e) => {
    e.preventDefault()

    const name = $("#registerName").val()
    const username = $("#registerUsername").val()
    const email = $("#registerEmail").val()
    const password = $("#registerPassword").val()
    const confirmPassword = $("#registerConfirmPassword").val()

    // Basic validation
    if (!name || !username || !email || !password || !confirmPassword) {
      $("#registerError").text("Please fill in all fields").show()
      return
    }

    if (password !== confirmPassword) {
      $("#registerError").text("Passwords do not match").show()
      return
    }

    // Check if username already exists
    if (users.some((u) => u.username === username)) {
      $("#registerError").text("Username already exists").show()
      return
    }

    // Simulate registration (in a real app, this would be an AJAX call to a server)
    $("#registerForm button[type='submit']")
      .html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registering...')
      .prop("disabled", true)

    setTimeout(() => {
      // Add new user to the array
      const newUser = {
        id: users.length + 1,
        username: username,
        password: password,
        email: email,
        name: name,
      }
      users.push(newUser)

      // Close registration modal
      const registerModalInstance = bootstrap.Modal.getInstance(document.getElementById("registerModal"))
      registerModalInstance.hide()

      // Show success notification
      showNotification("Success", "Registration successful! You can now log in.", "success")

      // Reset form
      $("#registerForm")[0].reset()
      $("#registerForm button[type='submit']")
        .html('<i class="bi bi-person-plus"></i> Register')
        .prop("disabled", false)
      $("#registerError").hide()

      // Open login modal
      const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
      loginModal.show()
    }, 1500)
  })

  // ===== Smooth Scrolling =====
  $("a[href^='#']").on("click", function (e) {
    if (this.hash !== "") {
      e.preventDefault()

      const hash = this.hash

      $("html, body").animate(
        {
          scrollTop: $(hash).offset().top - 70,
        },
        800,
        () => {
          window.location.hash = hash
        },
      )
    }
  })

  // ===== Initialize Everything =====
  loadStats()
  loadTournaments()
  loadReviews()

  // Periodically update stats to simulate live data
  setInterval(() => {
    // Simulate changing stats
    const registeredTeams = Number.parseInt($("#registeredTeams").text().replace(/,/g, ""))
    const upcomingMatches = Number.parseInt($("#upcomingMatches").text())

    // Random changes
    $("#registeredTeams").text((registeredTeams + Math.floor(Math.random() * 3)).toLocaleString())
    $("#upcomingMatches").text((upcomingMatches + Math.floor(Math.random() * 2) - 1).toLocaleString())

    // Occasionally show a notification about new registrations
    if (Math.random() > 0.7) {
      showNotification("New Registration", "A new team just registered for a tournament!", "info")
    }
  }, 30000) // Every 30 seconds
})
