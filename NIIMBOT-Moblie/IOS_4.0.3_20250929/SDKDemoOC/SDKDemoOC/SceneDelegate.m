//
//  SceneDelegate.m
//  SDKDemoOC
//
//  Created by yu on 2024/6/6.
//

#import "SceneDelegate.h"

@interface SceneDelegate ()

@end

@implementation SceneDelegate

// 场景将要连接到窗口时调用
- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)connectionOptions  API_AVAILABLE(ios(13.0)) API_AVAILABLE(ios(13.0)){
    // 使用此方法可选地配置并将UIWindow `window`附加到提供的UIWindowScene `scene`
    // 如果使用storyboard，`window`属性将自动初始化和附加到场景
    // 此委托并不意味着连接场景或会话是新的
}

// 场景断开连接时调用
- (void)sceneDidDisconnect:(UIScene *)scene  API_AVAILABLE(ios(13.0)){
    // 当场景被系统释放时调用
    // 这发生在场景进入后台或其会话被丢弃后不久
    // 释放与此场景关联的任何资源，可以在下次场景连接时重新创建
}

// 场景变为活动状态时调用
- (void)sceneDidBecomeActive:(UIScene *)scene  API_AVAILABLE(ios(13.0)){
    // 当场景从非活动状态移动到活动状态时调用
    // 使用此方法重新启动场景处于非活动状态时暂停(或尚未启动)的任何任务
}

// 场景将要变为非活动状态时调用
- (void)sceneWillResignActive:(UIScene *)scene  API_AVAILABLE(ios(13.0)){
    // 当场景将从活动状态移动到非活动状态时调用
    // 这可能由于临时中断(如来电)而发生
}

// 场景将要进入前台时调用
- (void)sceneWillEnterForeground:(UIScene *)scene  API_AVAILABLE(ios(13.0)){
    // 当场景从后台过渡到前台时调用
    // 使用此方法撤消进入后台时所做的更改
}

// 场景进入后台时调用
- (void)sceneDidEnterBackground:(UIScene *)scene  API_AVAILABLE(ios(13.0)){
    // 当场景从前台过渡到后台时调用
    // 使用此方法保存数据，释放共享资源，并存储足够的场景特定状态信息
    // 以将场景恢复到当前状态
}

@end
