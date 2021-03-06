export enum EAccountType {
	k_EAccountTypeInvalid = 0,
	k_EAccountTypeIndividual = 1,
	k_EAccountTypeMultiseat = 2,
	k_EAccountTypeGameServer = 3,
	k_EAccountTypeAnonymousGameServer = 4,
	k_EAccountTypePending = 5,
	k_EAccountTypeContentServer = 6,
	k_EAccountTypeClan = 7,
	k_EAccountTypeChat = 8,
	k_EAccountTypeConsoleUser = 9,
	k_EAccountTypeAnonymousUser = 10,
	k_EAccountTypeMax = 11
}

export enum EResult {
	k_EResultOK = 1, // Success.
	k_EResultFail = 2, // Generic failure.
	k_EResultNoConnection = 3, // Your Steam client doesn't have a connection to the back-end.
	k_EResultInvalidPassword = 5, // Password/ticket is invalid.
	k_EResultLoggedInElsewhere = 6, // The user is logged in elsewhere.
	k_EResultInvalidProtocolVer = 7, // Protocol version is incorrect.
	k_EResultInvalidParam = 8, // A parameter is incorrect.
	k_EResultFileNotFound = 9, // File was not found.
	k_EResultBusy = 10, // Called method is busy - action not taken.
	k_EResultInvalidState = 11, // Called object was in an invalid state.
	k_EResultInvalidName = 12, // The name was invalid.
	k_EResultInvalidEmail = 13, // The email was invalid.
	k_EResultDuplicateName = 14, // The name is not unique.
	k_EResultAccessDenied = 15, // Access is denied.
	k_EResultTimeout = 16, // Operation timed out.
	k_EResultBanned = 17, // The user is VAC2 banned.
	k_EResultAccountNotFound = 18, // Account not found.
	k_EResultInvalidSteamID = 19, // The Steam ID was invalid.
	k_EResultServiceUnavailable = 20, // The requested service is currently unavailable.
	k_EResultNotLoggedOn = 21, // The user is not logged on.
	k_EResultPending = 22, // Request is pending, it may be in process or waiting on third party.
	k_EResultEncryptionFailure = 23, // Encryption or Decryption failed.
	k_EResultInsufficientPrivilege = 24, // Insufficient privilege.
	k_EResultLimitExceeded = 25, // Too much of a good thing.
	k_EResultRevoked = 26, // Access has been revoked (used for revoked guest passes.)
	k_EResultExpired = 27, // License/Guest pass the user is trying to access is expired.
	k_EResultAlreadyRedeemed = 28, // Guest pass has already been redeemed by account, cannot be used again.
	k_EResultDuplicateRequest = 29, // The request is a duplicate and the action has already occurred in the past, ignored this time.
	k_EResultAlreadyOwned = 30, // All the games in this guest pass redemption request are already owned by the user.
	k_EResultIPNotFound = 31, // IP address not found.
	k_EResultPersistFailed = 32, // Failed to write change to the data store.
	k_EResultLockingFailed = 33, // Failed to acquire access lock for this operation.
	k_EResultLogonSessionReplaced = 34, // The logon session has been replaced.
	k_EResultConnectFailed = 35, // Failed to connect.
	k_EResultHandshakeFailed = 36, // The authentication handshake has failed.
	k_EResultIOFailure = 37, // There has been a generic IO failure.
	k_EResultRemoteDisconnect = 38, // The remote server has disconnected.
	k_EResultShoppingCartNotFound = 39, // Failed to find the shopping cart requested.
	k_EResultBlocked = 40, // A user blocked the action.
	k_EResultIgnored = 41, // The target is ignoring sender.
	k_EResultNoMatch = 42, // Nothing matching the request found.
	k_EResultAccountDisabled = 43, // The account is disabled.
	k_EResultServiceReadOnly = 44, // This service is not accepting content changes right now.
	k_EResultAccountNotFeatured = 45, // Account doesn't have value, so this feature isn't available.
	k_EResultAdministratorOK = 46, // Allowed to take this action, but only because requester is admin.
	k_EResultContentVersion = 47, // A Version mismatch in content transmitted within the Steam protocol.
	k_EResultTryAnotherCM = 48, // The current CM can't service the user making a request, user should try another.
	k_EResultPasswordRequiredToKickSession = 49, // You are already logged in elsewhere, this cached credential login has failed.
	k_EResultAlreadyLoggedInElsewhere = 50, // The user is logged in elsewhere. (Use k_EResultLoggedInElsewhere instead!)
	k_EResultSuspended = 51, // Long running operation has suspended/paused. (eg. content download.)
	k_EResultCancelled = 52, // Operation has been canceled, typically by user. (eg. a content download.)
	k_EResultDataCorruption = 53, // Operation canceled because data is ill formed or unrecoverable.
	k_EResultDiskFull = 54, // Operation canceled - not enough disk space.
	k_EResultRemoteCallFailed = 55, // The remote or IPC call has failed.
	k_EResultPasswordUnset = 56, // Password could not be verified as it's unset server side.
	k_EResultExternalAccountUnlinked = 57, // External account (PSN, Facebook...) is not linked to a Steam account.
	k_EResultPSNTicketInvalid = 58, // PSN ticket was invalid.
	k_EResultExternalAccountAlreadyLinked = 59, // External account (PSN, Facebook...) is already linked to some other account, must explicitly request to replace/delete the link first.
	k_EResultRemoteFileConflict = 60, // The sync cannot resume due to a conflict between the local and remote files.
	k_EResultIllegalPassword = 61, // The requested new password is not allowed.
	k_EResultSameAsPreviousValue = 62, // New value is the same as the old one. This is used for secret question and answer.
	k_EResultAccountLogonDenied = 63, // Account login denied due to 2nd factor authentication failure.
	k_EResultCannotUseOldPassword = 64, // The requested new password is not legal.
	k_EResultInvalidLoginAuthCode = 65, // Account login denied due to auth code invalid.
	k_EResultAccountLogonDeniedNoMail = 66, // Account login denied due to 2nd factor auth failure - and no mail has been sent.
	k_EResultHardwareNotCapableOfIPT = 67, // The users hardware does not support Intel's Identity Protection Technology (IPT).
	k_EResultIPTInitError = 68, // Intel's Identity Protection Technology (IPT) has failed to initialize.
	k_EResultParentalControlRestricted = 69, // Operation failed due to parental control restrictions for current user.
	k_EResultFacebookQueryError = 70, // Facebook query returned an error.
	k_EResultExpiredLoginAuthCode = 71, // Account login denied due to an expired auth code.
	k_EResultIPLoginRestrictionFailed = 72, // The login failed due to an IP restriction.
	k_EResultAccountLockedDown = 73, // The current users account is currently locked for use. This is likely due to a hijacking and pending ownership verification.
	k_EResultAccountLogonDeniedVerifiedEmailRequired = 74, // The logon failed because the accounts email is not verified.
	k_EResultNoMatchingURL = 75, // There is no URL matching the provided values.
	k_EResultBadResponse = 76, // Bad Response due to a Parse failure, missing field, etc.
	k_EResultRequirePasswordReEntry = 77, // The user cannot complete the action until they re-enter their password.
	k_EResultValueOutOfRange = 78, // The value entered is outside the acceptable range.
	k_EResultUnexpectedError = 79, // Something happened that we didn't expect to ever happen.
	k_EResultDisabled = 80, // The requested service has been configured to be unavailable.
	k_EResultInvalidCEGSubmission = 81, // The files submitted to the CEG server are not valid.
	k_EResultRestrictedDevice = 82, // The device being used is not allowed to perform this action.
	k_EResultRegionLocked = 83, // The action could not be complete because it is region restricted.
	k_EResultRateLimitExceeded = 84, // Temporary rate limit exceeded, try again later, different from k_EResultLimitExceeded which may be permanent.
	k_EResultAccountLoginDeniedNeedTwoFactor = 85, // Need two-factor code to login.
	k_EResultItemDeleted = 86, // The thing we're trying to access has been deleted.
	k_EResultAccountLoginDeniedThrottle = 87, // Login attempt failed, try to throttle response to possible attacker.
	k_EResultTwoFactorCodeMismatch = 88, // Two factor authentication (Steam Guard) code is incorrect.
	k_EResultTwoFactorActivationCodeMismatch = 89, // The activation code for two-factor authentication (Steam Guard) didn't match.
	k_EResultAccountAssociatedToMultiplePartners = 90, // The current account has been associated with multiple partners.
	k_EResultNotModified = 91, // The data has not been modified.
	k_EResultNoMobileDevice = 92, // The account does not have a mobile device associated with it.
	k_EResultTimeNotSynced = 93, // The time presented is out of range or tolerance.
	k_EResultSmsCodeFailed = 94, // SMS code failure - no match, none pending, etc.
	k_EResultAccountLimitExceeded = 95, // Too many accounts access this resource.
	k_EResultAccountActivityLimitExceeded = 96, // Too many changes to this account.
	k_EResultPhoneActivityLimitExceeded = 97, // Too many changes to this phone.
	k_EResultRefundToWallet = 98, // Cannot refund to payment method, must use wallet.
	k_EResultEmailSendFailure = 99, // Cannot send an email.
	k_EResultNotSettled = 100, // Can't perform operation until payment has settled.
	k_EResultNeedCaptcha = 101, // The user needs to provide a valid captcha.
	k_EResultGSLTDenied = 102, // A game server login token owned by this token's owner has been banned.
	k_EResultGSOwnerDenied = 103, // Game server owner is denied for some other reason such as account locked, community ban, vac ban, missing phone, etc.
	k_EResultInvalidItemType = 104, // The type of thing we were requested to act on is invalid.
	k_EResultIPBanned = 105, // The IP address has been banned from taking this action.
	k_EResultGSLTExpired = 106, // This Game Server Login Token (GSLT) has expired from disuse; it can be reset for use.
	k_EResultInsufficientFunds = 107, // user doesn't have enough wallet funds to complete the action
	k_EResultTooManyPending = 108 // There are too many of this thing pending already
}
