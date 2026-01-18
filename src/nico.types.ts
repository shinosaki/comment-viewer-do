export type EmbeddedData = {
  akashic: {
    isRunning: boolean
    isReplay: boolean
    lastDisabledTime: any
    isIndicateVisible: boolean
    enabled: boolean
    trustedChildOrigin: string
    emotionDisabledPlayIdThreshold: number
    isSkipping: boolean
    isRefusing: boolean
    isReadyToStart: boolean
  }
  site: {
    locale: string
    serverTime: number
    frontendVersion: string
    apiBaseUrl: string
    pollingApiBaseUrl: string
    staticResourceBaseUrl: string
    topPageUrl: string
    programCreatePageUrl: string
    programEditPageUrl: string
    programWatchPageUrl: string
    recentPageUrl: string
    programArchivePageUrl: string
    myPageUrl: string
    rankingPageUrl: string
    searchPageUrl: string
    focusPageUrl: string
    timetablePageUrl: string
    followedProgramsPageUrl: string
    frontendId: number
    currentRootRelativeUrl: string
    familyService: {
      account: {
        accountRegistrationPageUrl: string
        loginPageUrl: string
        logoutPageUrl: string
        premiumMemberRegistrationPageUrl: string
        trackingParams: {
          siteId: string
          pageId: string
          mode: string
        }
        profileRegistrationPageUrl: string
        contactsPageUrl: string
        verifyEmailsPageUrl: string
        accountSettingPageUrl: string
        premiumMeritPageUrl: string
        securitySettingPageUrl: string
      }
      app: {
        topPageUrl: string
      }
      channel: {
        topPageUrl: string
        forOrganizationAndCompanyPageUrl: string
        publicApiBaseUrl: string
      }
      commons: {
        topPageUrl: string
        cpp: {
          frontApiBaseUrl: string
          immediatePaySettingPageUrl: string
        }
      }
      dic: {
        topPageUrl: string
      }
      help: {
        liveHelpPageUrl: string
        systemRequirementsPageUrl: string
        nintendoGuidelinePageUrl: string
      }
      ichiba: {
        topPageUrl: string
      }
      news: {
        topPageUrl: string
      }
      nicoad: {
        topPageUrl: string
        apiBaseUrl: string
      }
      nicokoken: {
        topPageUrl: string
        helpPageUrl: string
      }
      niconico: {
        topPageUrl: string
        userPageBaseUrl: string
      }
      point: {
        topPageUrl: string
        purchasePageUrl: string
      }
      seiga: {
        topPageUrl: string
        seigaPageBaseUrl: string
        comicPageBaseUrl: string
      }
      site: {
        salesAdvertisingPageUrl: string
        liveAppDownloadPageUrl: string
        videoPremiereIntroductionPageUrl: string
        creatorMonetizationInformationPageUrl: string
      }
      solid: {
        topPageUrl: string
      }
      video: {
        topPageUrl: string
        myPageUrl: string
        watchPageBaseUrl: string
        liveWatchHistoryPageUrl: string
        uploadedVideoListPageUrl: string
        ownedTicketsPageUrl: string
        purchasedSerialsPageUrl: string
        timeshiftReservationsPageUrl: string
        myBroadcastHistoryPageUrl: string
        programModeratorManagementPageUrl: string
      }
      faq: {
        pageUrl: string
      }
      bugreport: {
        pageUrl: string
      }
      rightsControlProgram: {
        pageUrl: string
      }
      licenseSearch: {
        pageUrl: string
      }
      search: {
        suggestionApiUrl: string
      }
      nicoex: {
        apiBaseUrl: string
      }
      akashic: {
        untrustedFrameUrl: string
      }
      superichiba: {
        apiBaseUrl: string
        launchApiBaseUrl: string
        oroshiuriIchibaBaseUrl: string
      }
      nAir: {
        topPageUrl: string
      }
      emotion: {
        baseUrl: string
      }
      gift: {
        topPageUrl: string
      }
      creatorSupport: {
        supporterRegistrationBaseUrl: string
      }
      muteStore: {
        apiBaseUrl: string
      }
      astral: {
        sendLogAsTest: boolean
        watchEventLogBaseUrl: string
      }
      income: {
        topPageUrl: string
      }
      nicoJk: {
        topPageUrl: string
      }
      nAnime: {
        topPageUrl: string
      }
      mjk: {
        apiBaseUrl: string
      }
    }
    environments: {
      runningMode: string
    }
    relive: {
      apiBaseUrl: string
      channelApiBaseUrl: string
      webSocketUrl: string
      csrfToken: string
      audienceToken: string
    }
    information: {
      maintenanceInformationPageUrl: string
    }
    namaGamePageUrl: string
    rule: {
      agreementPageUrl: string
      guidelinePageUrl: string
    }
    spec: {
      watchUsageAndDevicePageUrl: string
      broadcastUsageDevicePageUrl: string
      cruisePageUrl: string
      broadcastTutorialPageUrl: string
    }
    ad: {
      adsApiBaseUrl: string
    }
    tag: {
      revisionCheckIntervalMs: number
      registerHelpPageUrl: string
      userRegistrableMax: number
      textMaxLength: number
    }
    coe: {
      coeContentBaseUrl: string
    }
    broadcast: {
      usageHelpPageUrl: string
      stableBroadcastHelpPageUrl: string
      nair: {
        downloadPageUrl: string
      }
      broadcasterStreamHelpPageUrl: string
    }
    enquete: {
      usageHelpPageUrl: string
    }
    trialWatch: {
      usageHelpPageUrl: string
    }
    autoExtend: {
      usageHelpPageUrl: string
    }
    recommendReactionLog: {
      publicApiBaseUrl: string
    }
    dmc: {
      webRtc: {
        stunServerUrls: Array<any>
      }
    }
    frontendPublicApiUrl: string
    party1staticBaseUrl: string
    party1binBaseUrl: string
    party2binBaseUrl: string
    gift: {
      cantOpenPageCausedAdBlockHelpPageUrl: string
    }
    creatorPromotionProgram: {
      registrationHelpPageUrl: string
    }
    stream: {
      lowLatencyHelpPageUrl: string
    }
    performance: {
      commentRender: {
        liteModeHelpPageUrl: string
      }
    }
    nico: {
      webPushNotificationReceiveSettingHelpPageUrl: string
    }
    akashic: {
      switchRenderHelpPageUrl: string
    }
    device: {
      watchOnPlayStation4HelpPageUrl: string
      safariCantWatchHelpPageUrl: string
    }
    nicoCommonHeaderResourceBaseUrl: string
    authony: {
      apiBaseUrl: string
    }
    follo: {
      publicApiBaseUrl: string
    }
    payment: {
      eventPageBaseUrl: string
      productPageBaseUrl: string
    }
    externalWatch: {
      baseUrl: string
    }
    channelRegistration: {
      multiSubscriptionWithPremiumBenefitHelpPageUrl: string
    }
    broadcastRequest: {
      apiBaseUrl: string
    }
    konomiTag: {
      usageHelpPageUrl: string
    }
    dcdn: {
      baseUrl: string
      logGifUrl: string
    }
    moderator: {
      moderatorHelpPageUrl: string
    }
    feedbackPageUrl: string
    defaultUserIconUrl: {
      '150x150': string
      '50x50': string
    }
  }
  user: {
    isCrawler: boolean
    isExplicitlyLoginable: boolean
    isMobileMailAddressRegistered: boolean
    isMailRegistered: boolean
    isProfileRegistered: boolean
    isLoggedIn: boolean
    accountType: string
    isOperator: boolean
    isBroadcaster: boolean
    premiumOrigin: string
    permissions: Array<string>
    nicosid: string
    superichiba: {
      deletable: boolean
      hasBroadcasterRole: boolean
    }
    allowSensitiveContents: boolean
  }
  program: {
    allegation: {
      commentAllegationApiUrl: string
    }
    nicoliveProgramId: string
    providerType: string
    visualProviderType: string
    title: string
    thumbnail: {
      small: string
    }
    screenshot: {
      urlSet: {
        large: string
        middle: string
        small: string
        micro: string
      }
    }
    supplier: {
      supplierType: string
      name: string
      pageUrl: string
      introduction: string
      nicopediaArticle: {
        pageUrl: string
        exists: boolean
      }
      programProviderId: string
      icons: {
        uri50x50: string
        uri150x150: string
      }
      level: number
      accountType: string
    }
    openTime: number
    beginTime: number
    vposBaseTime: number
    endTime: number
    scheduledEndTime: number
    status: 'ON_AIR' | 'ENDED'
    description: string
    substitute: {}
    tag: {
      updateApiUrl: string
      lockApiUrl: string
      reportApiUrl: string
      list: Array<{
        text: string
        existsNicopediaArticle: boolean
        nicopediaArticlePageUrl: string
        type: string
        isLocked: boolean
        isDeletable: boolean
        isReserved?: boolean
      }>
      isLocked: boolean
    }
    links: {
      feedbackPageUrl: string
      contentsTreePageUrl: string
      programReportPageUrl: string
    }
    player: {
      embedUrl: string
    }
    watchPageUrl: string
    gatePageUrl: string
    mediaServerType: string
    isPrivate: boolean
    isTest: boolean
    audienceCommentCommand: {
      isColorCodeEnabled: boolean
    }
    report: {
      imageApiUrl: string
    }
    isFollowerOnly: boolean
    isNicoadEnabled: boolean
    isGiftEnabled: boolean
    stream: {
      maxQuality: string
    }
    superichiba: {
      allowAudienceToAddNeta: boolean
      canSupplierUse: boolean
    }
    isChasePlayEnabled: boolean
    isTimeshiftDownloadEnabled: boolean
    statistics: {
      watchCount: number
      commentCount: number
      timeshiftReservationCount: any
    }
    isPremiumAppealBannerEnabled: boolean
    isRecommendEnabled: boolean
    isEmotionEnabled: boolean
    commentFollowerOnlyMode: {
      isEnabled: boolean
    }
    isStoryboardEnabled: boolean
  }
  socialGroup: {
    type: string
    id: string
    broadcastHistoryPageUrl: string
    description: string
    name: string
    socialGroupPageUrl: string
    thumbnailImageUrl: string
    thumbnailSmallImageUrl: string
    level: number
    isFollowed: boolean
    isJoined: boolean
  }
  player: {
    name: string
    audienceToken: string
    isJumpDisabled: boolean
    disablePlayVideoAd: boolean
    isRestrictedCommentPost: boolean
    streamAllocationType: string
  }
  ad: {
    billboardZoneId: any
    siteHeaderBannerZoneId: number
    programInformationZoneId: number
    footerZoneId: number
    playerZoneId: number
    adsJsUrl: string
  }
  billboard: {}
  nicoEnquete: {
    isEnabled: boolean
  }
  community: {
    id: string
    followPageUrl: string
    unfollowPageUrl: string
  }
  communityFollower: {
    records: Array<any>
  }
  userProgramWatch: {
    canWatch: boolean
    expireTime: any
    canAutoRefresh: boolean
    payment: {
      hasTicket: boolean
    }
    isCountryRestrictionTarget: boolean
  }
  userProgramReservation: {
    isReserved: boolean
  }
  programWatch: {
    condition: {
      needLogin: boolean
    }
  }
  programTimeshift: {
    watchLimit: string
    publication: {
      status: string
      expireTime: number
    }
    reservation: {
      expireTime: number
    }
  }
  programTimeshiftWatch: {
    condition: {
      needReservation: boolean
    }
  }
  programBroadcaster: {
    konomiTags: Array<{
      text: string
      nicopediaArticleId: number
      nicopediaArticleUrl: string
    }>
    level: number
    permissions: any
    positions: Array<any>
    premiumFollowNumberForNextLevel: number
    progressRateToReachNextLevel: number
    broadcastCount: number
  }
  programSuperichiba: {
    programIsPermittedToRequestSpecificNeta: boolean
  }
  planningEvent: {
    id: any
    name: string
    refParameter: string
    logo: {
      imageUrl: string
    }
    backgroundImageUrl: any
    linkUrl: string
    tagNameList: Array<any>
    schedule: {
      startUnixTimeMs: number
      endUnixTimeMs: number
    }
    displayType: string
  }
  userCommentBehavior: {
    isImproper: boolean
  }
  broadcasterBroadcastRequest: {
    recievedUserId: any
    thanksMessageText: string
    readList: {
      items: Array<any>
    }
    unreadList: {
      items: Array<any>
      requestTotal: any
    }
  }
  restriction: {
    developmentFeatures: Array<any>
  }
  googleAnalytics: {
    shouldSmapling: boolean
  }
  userMute: {
    targets: Array<any>
  }
  userProgramTimeshiftWatch: {
    status: any
  }
  astral: {
    alive: boolean
  }
  userIconResource: {
    userIconResourceBaseUrl: string
  }
  userCreatorSupportSummary: {
    supportingCreatorIds: Array<any>
  }
  creatorCreatorSupportSummary: {
    isSupportable: boolean
  }
  programAccessControl: {
    visibilityType: string
  }
  programEdit: {
    isSending: boolean
    hasError: boolean
    editingProgram: {
      commentFollowerOnlyModeRequiredFollowDurationSecOptions: Array<number>
      cppAutoRegisterOnProgramEnd: boolean
    }
  }
  userBroadcastRequest: {
    recievedUserId: any
    thanksMessageText: string
  }
  userBroadcastRequestUnreadList: {
    requestTotal: number
    items: Array<any>
  }
}
