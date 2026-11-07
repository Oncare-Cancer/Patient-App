/**
 * English strings — the source of truth.
 *
 * The shape of this object defines the contract every other locale must meet
 * (see ./README.md for why the namespaces are split the way they are).
 *
 * Copy is taken verbatim from Oncare_Plus_App_Redesign.pdf wherever the PDF
 * specifies it, so the screens read exactly as designed. Strings the PDF does
 * not specify — loading, empty and error states — are marked with a NOT IN PDF
 * comment so a reviewer can tell design from invention.
 */
export const en = {
  ui: {
    common: {
      continue: 'Continue',
      cancel: 'Cancel',
      change: 'Change',
      edit: 'Edit',
      save: 'Save',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      search: 'Search',
      submit: 'Submit',
      skip: 'Skip',
      logout: 'Logout',
      share: 'Share',
      download: 'Download',
      optional: 'optional',
      approx: 'approx.',
      // NOT IN PDF — loading / empty / error states are not in the mockups.
      loading: 'Loading…',
      retry: 'Try again',
      somethingWrong: 'Something went wrong',
      noInternet: 'No internet connection',
      invalidOtp: 'That code did not match. Please try again.',
    },

    nav: {
      home: 'Home',
      activity: 'Activity',
      /** Replaced Activity in the bottom bar; Activity moved into Profile. */
      explore: 'Explore',
      book: 'Book',
      records: 'Records',
      profile: 'Profile',
    },

    explore: {
      title: 'Explore',
      subtitle: 'Our centres and specialists',
      tabCentres: 'Centres',
      tabDoctors: 'Doctors',
      searchCentres: 'Search by centre or area',
      searchDoctors: 'Search doctor or speciality',
      noCentres: 'No centres found',
      noDoctors: 'No doctors found',
      doctorsHere: 'Doctors at this centre',
      aboutCentre: 'About this centre',
      openingHours: 'Opening hours',
      bookHere: 'Book at this centre',
      bookWith: 'Book with this doctor',
      viewProfile: 'View profile',
      about: 'About',
      expertise: 'Areas of expertise',
      languages: 'Languages',
      qualifications: 'Qualifications',
      practisesAt: 'Practises at',
      centreCount: '{{count}} centres',
      doctorCount: '{{count}} doctors',
      ourServices: 'Our services',
      patientReviews: 'Patient reviews',
      reviewsNote: 'Verified reviews from Google — real experiences from our patients.',
      readMore: 'Read more',
      starsOf5: '{{stars}} out of 5 stars',
      faqTitle: 'Frequently asked questions',
      careBuddyTitle: 'Need guidance? Talk to our care buddy',
      careBuddyBody: 'Get a free cost estimate for your treatment plan.',
      bookNow: 'Book now',
      requestCallback: 'Request a callback',
      virtualTour: 'Virtual tour',
      watchOnYoutube: 'Watch on YouTube',
      publications: 'Publications & research',
      professionalExperience: 'Professional experience',
      awardsTitle: 'Awards & recognition',
      educationTitle: 'Education & qualifications',
      advancedTraining: 'Advanced training',
      bookWithDoctor: 'Book with {{name}}',
      estimateFor: 'Get a free cost estimate from {{name}}.',
      doctorsAtCentre: '{{count}} doctors available to book',
      noDoctorsHere: 'No doctors listed for this centre yet',
    },

    upload: {
      camera: 'Take a photo',
      gallery: 'Choose from gallery',
      document: 'Choose a PDF',
      fromRecords: 'Pick from My Records',
      // NOT IN PDF — the mockups show the limits but not the messages for
      // breaking them.
      tooMany: 'You can attach up to 3 files',
      tooLarge: 'Each file must be under 10 MB',
      badType: 'Only JPG, PNG or PDF files',
      permission: 'Permission is needed to attach a file',
      uploading: 'Uploading…',
      uploadFailed: 'Could not upload. Please try again.',
    },

    language: {
      title: 'Language',
      subtitle: 'Choose how you would like to read the app',
      english: 'English',
      hindi: 'हिन्दी',
      // NOT IN PDF — the login-screen picker is an addition beyond the design.
      choosePrompt: 'Choose your language',
    },

    login: {
      // Three hero slides, rotated automatically by LoginHero. Each line is
      // hard-wrapped to three lines so the hero does not change height as the
      // slides advance.
      heroLine: 'Cancer care,\nwith clarity and\ncompassion.',
      heroSub: 'Your appointments, reports and care team — in one place.',
      heroLine2: 'Book with the\ndoctor you\nalready trust.',
      heroSub2: 'Pick a centre, a doctor and a slot in under a minute.',
      heroLine3: 'Reports and\nprescriptions,\nalways with you.',
      heroSub3: 'Every visit, test and medicine in one timeline.',
      title: 'Login to Oncare Plus',
      tabMobile: 'Mobile number',
      tabUid: 'Hospital UID',
      mobileLabel: 'Mobile number',
      uidLabel: 'Hospital UID',
      getOtp: 'Get OTP on WhatsApp',
      /**
       * Describes what sendOTP actually does. The previous line claimed "your
       * mobile number creates your account", which is false: the number is
       * looked up in the hospital system, and if it is not found the backend
       * returns code 3 and asks for a name so the team can call back. Nothing
       * is ever created from the app.
       */
      newUserNote:
        'Use the mobile number you gave at the centre. If we cannot find it, we will take your name and our team will call you back.',
      or: 'or',
      exploreWithoutLogin: 'Explore without login',
      exploreSubtitle: 'Browse centres, doctors and prices. No OTP needed.',
      /**
       * Split into five parts so the two links can be tappable without
       * string-slicing at runtime, and so Hindi can place them mid-sentence
       * where its word order needs them.
       */
      // No trailing space: LegalLine adds an explicit newline after this.
      termsPrefix: 'By continuing you agree to our',
      termsLink: 'Terms & Conditions',
      termsMid: ' and ',
      privacyLink: 'Privacy Policy',
      termsSuffix: '',
      verifyTitle: 'Verify OTP',
      otpSentOn: 'OTP sent on WhatsApp',
      enterCode: 'Enter 4-digit code',
      resendIn: 'Resend code in {{time}}',
      didntGet: "Didn't get it?",
      getSmsInstead: 'Get SMS instead',
      verifyContinue: 'Verify & continue',
      morePatients: 'More than one patient on this number?',
      patientPickerHint:
        'Shown after OTP if the number is linked to family members.',
      guestPromptTitle: 'Please login to continue',
      guestPromptBody:
        'You can browse doctors, centres and services as a guest. Login is needed to book, upload reports or track requests.',
      notNow: 'Not now',
      login: 'Login',
      selectionSaved: 'Your selection is saved',
      loginToConfirm: 'Login to confirm your booking',
      haveUid: 'Have a Hospital UID?',
      loginWithUid: 'Login with UID',
      // Shown when a guest reaches a locked endpoint. Deliberately not
      // "Session expired": a guest never had a session, and that wording made
      // it look like the app had logged them out.
      loginRequiredTitle: 'Login to continue',
      loginRequiredBody:
        'Please login to book an appointment. You can also call us or submit a request and our team will get back to you.',
      sessionExpiredTitle: 'Session expired',
      sessionExpiredBody: 'Please login again to continue.',
    },

    home: {
      greetingMorning: 'Good morning,',
      greetingAfternoon: 'Good afternoon,',
      greetingEvening: 'Good evening,',
      hospitalId: 'Hospital ID',
      bookConsultation: 'Book a consultation',
      bookSubtitle: 'In-centre or video · {{count}} centres',
      searchPlaceholder: 'Search doctor or centre',
      searchTitle: 'Search',
      searchHint:
        'Search {{doctors}} doctors and {{centres}} centres by name, speciality or area.',
      searchNoResults: 'Nothing matched that search',
      nearest: 'Nearest',
      yourNextStep: 'Your next step',
      viewAll: 'View all',
      careServices: 'Care services',
      secondOpinion: 'Second Opinion',
      homeCare: 'Home Care',
      orderMedicines: 'Order Medicines',
      labTestAtHome: 'Lab Test at Home',
      admissionDaycare: 'Admission & Day-care',
      insuranceHelp: 'Insurance Help',
      // NOT IN PDF
      noUpcoming: 'No upcoming appointments',
    },

    guest: {
      welcome: 'Welcome to Oncare',
      helloGuest: 'Hello, Guest',
      browseNote: 'Browse doctors and slots — login only to confirm',
      notSureTitle: 'Not sure where to start?',
      notSureBody: 'Get a free call back from our care team',
      callMe: 'Call me',
      labTestPrices: 'Lab Test Prices',
      medicinePrices: 'Medicine Prices',
      ourCentres: 'Our Centres',
      loginToSee: 'Login to see your appointments, reports and requests',
      loginToBookTests: 'Login & upload prescription to book',
      loginToOrder: 'Login & upload prescription to order',
      howToOrder: 'How to order',
      resultsCount: '{{count}} results',
      callBackTitle: 'Request a call back',
      noLoginNeeded: 'No login needed',
      callBackBody:
        'Share your name and number. Our care team calls you to help with doctors, cost or second opinion.',
      yourName: 'Your name',
      fullName: 'Full name',
      mobileNumber: 'Mobile number',
      enterMobile: 'Enter 10-digit number',
      callingFor: 'Calling for',
      myself: 'Myself',
      familyMember: 'Family member',
      helpWith: 'What do you need help with?',
      consultation: 'Consultation',
      treatmentCost: 'Treatment cost',
      city: 'City',
      requestCallBack: 'Request call back',
    },

    booking: {
      title: 'Book appointment',
      stepCentre: 'Centre',
      stepDoctor: 'Doctor',
      stepSlot: 'Slot',
      stepConfirm: 'Confirm',
      chooseCentre: 'Choose a centre',
      searchArea: 'Search area or pincode',
      useMyLocation: 'Use my location to find the nearest centre',
      chooseDoctor: 'Choose a doctor',
      searchDoctor: 'Search doctor or speciality',
      all: 'All',
      nextAvailable: 'Next available',
      viewProfile: 'View profile',
      typeOfVisit: 'Type of visit',
      firstConsultation: 'First consultation',
      firstConsultationHint: 'New to this doctor',
      followUp: 'Follow-up',
      followUpHint: 'Seen before',
      atCentre: 'At centre',
      videoCall: 'Video call',
      pickDate: 'Pick a date',
      afternoon: 'Afternoon',
      evening: 'Evening',
      morning: 'Morning',
      greyedNote: 'Greyed slots are already booked.',
      reviewBooking: 'Review booking',
      reviewTitle: 'Review & confirm',
      visit: 'Visit',
      dateTime: 'Date & time',
      centre: 'Centre',
      patient: 'Patient',
      editDetails: 'Edit details',
      reasonLabel: 'Reason for visit',
      reasonPlaceholder: 'e.g. biopsy report review, new symptoms',
      attachReports: 'Attach recent reports',
      addReports: 'Add reports for the doctor',
      savedToRecords: 'Saved to your Records too',
      pleaseBring: 'Please bring',
      bringPhotoId: 'Photo ID and insurance card',
      bringReports: 'Previous reports, scans and prescriptions',
      confirmAppointment: 'Confirm appointment',
      confirmedTitle: 'Appointment confirmed',
      bookingId: 'Booking ID',
      confirmationSent: 'Confirmation sent on WhatsApp',
      doctor: 'Doctor',
      when: 'When',
      where: 'Where',
      directions: 'Directions',
      addToCalendar: 'Add to calendar',
      callCentre: 'Call centre',
      reminderNote: "We'll remind you on WhatsApp 1 day and 2 hours before.",
      viewMyAppointments: 'View my appointments',
      backToHome: 'Back to home',
      // NOT IN PDF — failure wording for the confirm step.
      bookFailed: 'Could not confirm that slot',
      bookFailedBody: 'It may have just been taken. Please pick another.',
      // Slots are fetched per visit type, so an empty list before one is chosen
      // is not the same as no availability.
      selectVisitTypeFirst: 'Choose a type of visit to see available times',
    },

    activity: {
      title: 'Activity',
      appointments: 'Appointments',
      requests: 'Requests',
      upcoming: 'Upcoming',
      past: 'Past',
      cancelled: 'Cancelled',
      reschedule: 'Reschedule',
      bookAgain: 'Book again',
      callCareTeam: 'Call care team',
      confirmPrice: 'Confirm price',
      viewAndConfirm: 'View & confirm',
      // NOT IN PDF
      noAppointments: 'No appointments here yet',
      noRequests: 'No requests yet',
      // NOT IN PDF — confirmation and result wording for reschedule/cancel.
      cancelTitle: 'Cancel this appointment?',
      cancelBody: 'You can book again any time.',
      cancelDone: 'Appointment cancelled',
      rescheduled: 'Appointment moved',
      noSlots: 'No slots on this day',
    },

    records: {
      title: 'My Records',
      search: 'Search reports, scans, prescriptions',
      all: 'All',
      lab: 'Lab',
      scans: 'Scans',
      rx: 'Rx',
      uploadReport: 'Upload a report',
      new: 'New',
      uploadedByYou: 'Uploaded by you',
      // The PDF names four chips. The data supports these two extra buckets and
      // not always the four, so the screen renders only what exists — see
      // services/records.ts.
      discharge: 'Discharge',
      other: 'Reports',
      // NOT IN PDF
      empty: 'No records yet',
      emptyBody: 'Reports from your visits will appear here.',
    },

    profile: {
      title: 'Profile',
      account: 'Account',
      personalDetails: 'Personal details',
      personalDetailsHint: 'DOB, Govt ID, address',
      familyMembers: 'Family members',
      familyMembersHint: 'Book & manage for {{count}} more patient',
      insuranceTpa: 'Insurance & TPA',
      insuranceTpaHint: 'Add policy for cashless treatment',
      preferences: 'Preferences',
      preferredCentre: 'Preferred centre',
      notifications: 'Notifications',
      notificationsHint: 'WhatsApp & app reminders',
      help: 'Help',
      callSupport: 'Call support',
      chatWhatsapp: 'Chat on WhatsApp',
      faqs: 'FAQs & raise a query',
      version: 'Version {{version}}',
      // NOT IN PDF. Family members, Insurance & TPA and Preferred centre are in
      // the design but have no API yet, so the rows say so rather than leading
      // nowhere.
      comingSoon: 'Coming soon',
      activityHint: 'Your appointments and requests',
      logoutTitle: 'Logout of Oncare Plus?',
      logoutConfirm: 'You will need your OTP to sign in again.',
      staySignedIn: 'Stay signed in',
    },

    sos: {
      emergencyHelp: 'Emergency help',
      whereAreYou: 'Where are you right now?',
      atCentre: 'At an Oncare centre',
      atCentreHint: 'Alert the centre team',
      atHome: 'At home',
      atHomeHint: 'Call ambulance / our team',
    },

    homeCare: {
      title: 'Home Care',
      heroTitle: 'Care at home, coordinated by your Oncare team',
      heroBody:
        'Choose a service, share a few details and our care team will call you to plan it.',
      whatDoYouNeed: 'What do you need?',
      labSample: 'Lab sample collection',
      labSampleHint: 'Blood tests & tumour markers at home',
      medicineDelivery: 'Medicine delivery',
      medicineDeliveryHint: 'Upload prescription, get cancer medicines',
      nursing: 'Nursing & injections',
      nursingHint: 'Injections, dressing, PICC / port care',
      palliative: 'Palliative & supportive care',
      palliativeHint: 'Pain, comfort & physiotherapy support',
      howItWorks: 'How it works',
      step1: 'Share details & prescription',
      step2: 'Care team calls you',
      step3: 'Track in Activity',
      visitAddress: 'Visit address',
      serviceableBy: 'Serviceable · handled by {{centre}}',
      preferredDate: 'Preferred date',
      today: 'Today',
      tomorrow: 'Tomorrow',
      pickDate: 'Pick a date',
      preferredTime: 'Preferred time',
      prescriptionAdvice: "Prescription / doctor's advice",
      uploadPrescription: 'Upload prescription',
      uploadHint: 'JPG, PNG or PDF · up to 3 files · 10 MB each',
      pickFromRecords: 'pick from My Records',
      noteForTeam: 'Note for our team',
      notePlaceholder: 'e.g. PICC line dressing, injection every 3 days',
      submitRequest: 'Submit request',
      callNote: 'Our care team calls you to confirm the visit and charges.',
      submittedTitle: 'Request submitted',
      willCallYou: 'Our team will call you on',
      requestId: 'Request ID',
      trackRequest: 'Track request',
      whatsappUpdates: "You'll get updates on WhatsApp",
    },

    medicine: {
      title: 'Order medicines',
      heroTitle: 'Your cancer medicines, from Oncare Pharmacy',
      heroBody:
        'Upload a prescription or pick medicines from the list. Our pharmacist confirms the actual price.',
      uploadPrescription: 'Upload prescription',
      uploadHint: 'We read it and add the medicines to your cart',
      searchAdd: 'Search & add',
      searchAddHint: 'Pick medicines from our list yourself',
      searchPlaceholder: 'Search medicine, e.g. capecitabine',
      add: 'Add',
      // NOT IN PDF — the mockups show a search box and nothing under it, which
      // leaves the screen looking broken until the patient types.
      commonlyOrdered: 'Commonly ordered at Oncare Pharmacy',
      commonlyOrderedHint:
        'Grouped by medicine, most stocked first. Search a brand name to see a specific pack.',
      brandsAvailable: '{{count}} brands',
      addAnother: 'Add again',
      viewCart: 'View cart',
      itemCount: '{{count}} item',
      itemCountPlural: '{{count}} items',
      prescriptionAdded: 'Prescription added',
      weReadIt: 'We read your prescription',
      weReadItBody: '{{count}} medicines added to your cart. Please check names and quantity.',
      somethingWrong: 'Something wrong?',
      searchAddMore: 'Search & add more',
      continueToDelivery: 'Continue to delivery',
      cartTitle: 'Cart & delivery',
      editCart: 'Edit cart',
      approxTotal: 'Approx. total',
      howDoYouWant: 'How do you want it?',
      homeDelivery: 'Home delivery',
      homeDeliveryHint: 'To your address',
      pickUp: 'Pick up',
      pickUpHint: 'At an Oncare centre',
      neededFor: 'Medicines needed for',
      sevenDays: '7 days',
      asPrescribed: 'As prescribed',
      someItems: 'Only some items',
      noteForPharmacist: 'Note for pharmacist',
      notePharmacistPlaceholder: 'e.g. only the injection, need by Monday',
      whatHappensNext: 'What happens next',
      next1: 'Pharmacist checks your prescription',
      next2: 'We call / WhatsApp you with availability & actual price',
      next3: 'You confirm and pay (online or on delivery)',
      next4: 'Medicines are delivered or kept ready at the centre',
      sendRequest: 'Send request',
      // NOT IN PDF — shown when the catalogue has no price for an item.
      priceOnConfirmation: 'Price on confirmation',
      // NOT IN PDF — the mockups assume the read always succeeds.
      couldNotRead: 'We could not read that prescription',
    },

    lab: {
      title: 'Lab tests',
      uploadPrescription: 'Upload prescription',
      uploadHint: 'We find the tests for you',
      selectTests: 'Select tests',
      selectTestsHint: 'Choose from the list',
      // NOT IN PDF — the mockups show the pincode chip but not why it is asked.
      pincodeHint: 'prices & home collection depend on your area',
      searchPlaceholder: 'Search test, e.g. CA 15-3, CBC',
      popular: 'Popular',
      tumourMarkers: 'Tumour markers',
      blood: 'Blood',
      liverKidney: 'Liver & kidney',
      reportIn: 'Report in {{time}}',
      homeCollection: 'Home collection',
      testsSelected: '{{count}} tests selected',
      testsFromPrescription: 'Tests from prescription',
      weFound: 'We found {{count}} tests in your prescription',
      weFoundBody:
        "Untick anything you don't need. Our team double-checks before collection.",
      missingTest: 'Missing a test?',
      searchAdd: 'Search & add',
      continueTests: 'Continue · {{count}} tests',
      bookCollection: 'Book sample collection',
      collectionAddress: 'Collection address',
      notePlaceholder: 'e.g. fasting test, patient is bed-bound',
      submitRequest: 'Submit request',
      confirmNote: 'Our team calls you to confirm the slot and the actual price.',
    },

    secondOpinion: {
      title: 'Second Opinion',
      heroTitle: 'A second opinion from our cancer specialists',
      heroBody:
        'Share your reports. An oncologist reviews your case and our team calls you with next steps.',
      typeOfCancer: 'Type of cancer',
      treatedAt: 'Treated at',
      treatedAtPlaceholder: 'Hospital / doctor name',
      yourQuestion: 'Your question for the doctor',
      questionPlaceholder: 'e.g. Is surgery needed? Other options?',
      reports: 'Reports',
      uploadReports: 'Upload reports',
      uploadReportsHint: 'Biopsy, PET-CT, MRI, blood tests',
      howConnect: 'How should we connect?',
      visitCentre: 'Visit a centre',
      preferredCentre: 'Preferred centre',
      requestButton: 'Request second opinion',
    },

    admission: {
      title: 'Admission & Day-care',
      whatIsPlanned: 'What is planned?',
      dayCareChemo: 'Day-care chemotherapy',
      dayCareChemoHint: 'Same-day, no overnight stay',
      admissionSurgery: 'Admission – surgery / IP care',
      admissionSurgeryHint: 'Planned stay at the centre',
      radiation: 'Radiation therapy',
      radiationHint: 'Planning & sessions',
      treatingDoctor: 'Doctor',
      doctorsAdvice: "Doctor's advice / previous summary",
      uploadDocuments: 'Upload documents',
      uploadDocumentsHint: 'Treatment plan, discharge summary',
      howPay: 'How will you pay?',
      insuranceTpa: 'Insurance / TPA',
      selfPay: 'Self pay',
      govtScheme: 'Govt. scheme',
      policy: 'Policy',
      sendEstimate: 'Send me a cost estimate',
      sendEstimateHint: 'Shared before you confirm',
      submitButton: 'Submit admission request',
    },

    /**
     * What we tell the patient when a line could not be matched cleanly.
     *
     * NOT IN PDF — the mockups only show the happy path where every item has a
     * price. In the real catalogue roughly half the lab items have none and some
     * are absent entirely, so these states needed wording. The rule they follow:
     * say who resolves it, never imply the request is stuck.
     */
    faq: {
      // NOT IN PDF — the mockups show the Help rows but not this screen.
      empty: 'No help topics yet',
      stillNeedHelp: 'Still need help?',
      yourQuestion: 'Your question',
      questionPlaceholder: 'Tell us what you need help with',
      querySent: 'We have your question',
      querySentBody: 'Our team will get back to you',
      replyNote: 'We usually reply within one working day.',
      yourEmail: 'Your email',
      emailPlaceholder: 'name@example.com',
      emailRequired: 'Please enter your email so we can reply',
      emailInvalid: 'Please enter a valid email address',
      questionTooShort: 'Please describe your question in a few more words',
    },

    personal: {
      name: 'Name',
      mobile: 'Mobile',
      gender: 'Gender',
      age: 'Age',
      dob: 'Date of birth',
      address: 'Address',
      area: 'Area',
      city: 'City',
      state: 'State',
      registeredAt: 'Registered at',
      // These come from the hospital record and the mobile API has no write
      // path, so the screen says who can change them.
      changeNote:
        'These details come from your hospital record. To change them, please tell the front desk at your centre or call support.',
    },

    notifications: {
      // NOT IN PDF — no notifications screen is specified.
      empty: 'No notifications yet',
      emptyBody:
        'Appointment reminders and updates on your requests will appear here.',
    },

    match: {
      ambiguous: 'We stock a few brands — our pharmacist will pick one',
      strengthMismatch: 'Our pharmacist will confirm this strength',
      unpriced: 'Price shared on confirmation',
      unmatched: 'Our team will source this and share the price',
    },

    insurance: {
      // NOT IN PDF — section 05 lists the tile but gives it no screen, and
      // section 19 leaves payment/insurance options open with Finance.
      title: 'Help with insurance & TPA',
      body:
        'Our billing desk helps you use your policy at an Oncare centre, and tells you what is covered before treatment starts.',
      whatWeHelp: 'What we help with',
      helpCashless: 'Checking if your policy is accepted for cashless treatment',
      helpPreAuth: 'Raising and following up pre-authorisation with your TPA',
      helpDocuments: 'Preparing the documents your insurer asks for',
      helpSchemes: 'Govt. schemes you may be eligible for',
      admissionNote:
        'Planning an admission or day-care? Share your policy there and we will share a cost estimate before you confirm.',
    },

    status: {
      submitted: 'Submitted',
      called: 'Called',
      scheduled: 'Scheduled',
      priceShared: 'Price shared',
      inProgress: 'In progress',
      completed: 'Completed',
      closed: 'Closed',
      confirmed: 'Confirmed',
      pharmacistReviewing: 'Pharmacist reviewing',
      doctorReviewing: 'Doctor reviewing',
      sampleCollected: 'Sample collected',
      reportInRecords: 'Report in My Records',
      careTeamCalled: 'Care team called you',
      visitScheduled: 'Visit scheduled',
    },
  },

  /**
   * English-locked. Present in both locales with identical values — they exist
   * as keys only so a reviewer can see the full set of medical tokens in one
   * place, and so nothing renders them through a translation lookup by accident.
   */
  clinical: {
    rxRequired: 'Rx required',
    stripOf: 'Strip of {{count}} tablets',
    asPerRx: 'as per Rx',
  },

  /**
   * Needs Marketing/Legal sign-off before a Hindi version ships. See README.
   */
  legal: {
    approxPriceNote:
      'Approx. price based on your search. For actual pricing, please login and upload your medical documents.',
    // Shown instead of the above once the patient is logged in. The price is
    // still approximate — the catalogue number is not a quote — but telling a
    // logged-in patient to log in is a bug, and "upload your documents" is
    // already what the screen itself asks for.
    approxPriceNoteLoggedIn:
      'Approx. price from our catalogue. Our team confirms the final price after reviewing your prescription and reports.',
    consentSecondOpinion:
      'I agree to share my reports with Oncare doctors for review.',
    consentCallBack:
      'I agree to be contacted by Oncare on call and WhatsApp.',
    emergency112: 'Life-threatening? Call {{number}} now',
    guestLeadNote: 'Creates a lead on the Central Ops Dashboard (source: App – Guest).',
  },
} as const;

/**
 * `en` is `as const` so that `StringKey` can be derived from it as a union of
 * real dotted paths — that is what makes `t('ui.booking.titel')` a compile
 * error instead of a blank label at runtime.
 *
 * The side effect is that every leaf has a literal type ("Continue" rather than
 * string), which no other locale can satisfy. `Widen` relaxes the leaves back to
 * `string` while keeping the shape, so `hi.ts` is checked for *structure*
 * without being asked to repeat the English words.
 */
type Widen<T> = T extends string
  ? string
  : { -readonly [K in keyof T]: Widen<T[K]> };

export type Strings = Widen<typeof en>;

/** The literal-typed table, used only to derive key paths. */
export type StringsConst = typeof en;
