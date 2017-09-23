/*
 * Copyright © Région Nord Pas de Calais-Picardie,  Département 91, Région Aquitaine-Limousin-Poitou-Charentes, 2016.
 *
 * This file is part of OPEN ENT NG. OPEN ENT NG is a versatile ENT Project based on the JVM and ENT Core Project.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation (version 3 of the License).
 *
 * For the sake of explanation, any module that communicate over native
 * Web protocols, such as HTTP, with OPEN ENT NG is outside the scope of this
 * license and could be license under its own terms. This is merely considered
 * normal use of OPEN ENT NG, and does not fall under the heading of "covered work".
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

package net.atos.entng.actualites.controllers;

import static org.entcore.common.http.response.DefaultResponseHandler.arrayResponseHandler;
import static org.entcore.common.http.response.DefaultResponseHandler.defaultResponseHandler;
import static org.entcore.common.http.response.DefaultResponseHandler.notEmptyResponseHandler;
import static org.entcore.common.user.UserUtils.getUserInfos;

import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import net.atos.entng.actualites.Actualites;
import net.atos.entng.actualites.filters.InfoFilter;
import net.atos.entng.actualites.filters.ThreadFilter;
import net.atos.entng.actualites.services.InfoService;
import net.atos.entng.actualites.services.ThreadService;
import net.atos.entng.actualites.services.impl.InfoServiceSqlImpl;
import net.atos.entng.actualites.services.impl.ThreadServiceSqlImpl;

import net.atos.entng.actualites.utils.Events;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;
import org.vertx.java.core.Handler;
import org.vertx.java.core.http.HttpServerRequest;
import org.vertx.java.core.json.JsonArray;
import org.vertx.java.core.json.JsonObject;

import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Delete;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Post;
import fr.wseduc.rs.Put;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.Either;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.request.RequestUtils;

public class InfoController extends ControllerHelper {

    private static final String INFO_ID_PARAMETER = "id";
    private static final String RESULT_SIZE_PARAMETER = "resultSize";

    private static final String SCHEMA_INFO_CREATE = "createInfo";
    private static final String SCHEMA_INFO_UPDATE = "updateInfo";

    private static final String RESOURCE_NAME = "info";
    private static final String EVENT_TYPE = "NEWS";
    private static final String NEWS_SUBMIT_EVENT_TYPE = EVENT_TYPE + "_SUBMIT";
    private static final String NEWS_UNSUBMIT_EVENT_TYPE = EVENT_TYPE + "_UNSUBMIT";
    private static final String NEWS_PUBLISH_EVENT_TYPE = EVENT_TYPE + "_PUBLISH";
    private static final String NEWS_UNPUBLISH_EVENT_TYPE = EVENT_TYPE + "_UNPUBLISH";
    private static final String NEWS_UPDATE_EVENT_TYPE = EVENT_TYPE + "_UPDATE";


    // TODO : refactor code to use enums or constants for statuses
    // TRASH: 0; DRAFT: 1; PENDING: 2; PUBLISHED: 3
    private static final List<Integer> status_list = new ArrayList<Integer>(Arrays.asList(0, 1, 2, 3));

    protected final InfoService infoService;
    protected final ThreadService threadService;

    public InfoController(){
        this.infoService = new InfoServiceSqlImpl();
        this.threadService = new ThreadServiceSqlImpl();
    }

    @Get("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/:"+Actualites.INFO_RESOURCE_ID)
    @ApiDoc("Retrieve : retrieve an Info in thread by thread and by id")
    @ResourceFilter(InfoFilter.class)
    @SecuredAction(value = "info.read", type = ActionType.RESOURCE)
    public void getInfo(final HttpServerRequest request) {
        // TODO IMPROVE @SecuredAction : Security on Info as a resource
        final String infoId = request.params().get(Actualites.INFO_RESOURCE_ID);
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                infoService.retrieve(infoId, user, notEmptyResponseHandler(request));
            }
        });
    }

    @Get("/infos")
    @ApiDoc("Get infos.")
    @SecuredAction("actualites.infos.list")
    public void listInfos(final HttpServerRequest request) {
        // TODO IMPROVE : Security on Infos visibles by statuses / dates is not enforced
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(UserInfos user) {
                infoService.list(user, arrayResponseHandler(request));
            }
        });
    }

    @Get("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/infos")
    @ApiDoc("Get infos in thread by thread id.")
    @ResourceFilter(ThreadFilter.class)
    @SecuredAction(value = "thread.contrib", type = ActionType.RESOURCE)
    public void listInfosByThreadId(final HttpServerRequest request) {
        // TODO IMPROVE : Security on Infos visibles by statuses / dates is not enforced
        final String threadId = request.params().get(Actualites.THREAD_RESOURCE_ID);
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(UserInfos user) {
                infoService.listByThreadId(threadId, user, arrayResponseHandler(request));
            }
        });
    }

    @Get("/linker/infos")
    @ApiDoc("List infos without their content. Used by linker")
    @SecuredAction("actualites.infos.list")
    public void listInfosForLinker(final HttpServerRequest request) {
        // TODO IMPROVE : Security on Infos visibles by statuses / dates is not enforced
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(UserInfos user) {
                infoService.listForLinker(user, arrayResponseHandler(request));
            }
        });
    }

    @Get("/infos/last/:"+RESULT_SIZE_PARAMETER)
    @ApiDoc("Get infos in thread by status and by thread id.")
    @SecuredAction("actualites.infos.list")
    public void listLastPublishedInfos(final HttpServerRequest request) {
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(UserInfos user) {
                String resultSize = request.params().get(RESULT_SIZE_PARAMETER);
                int size;
                if (resultSize == null || resultSize.trim().isEmpty()) {
                    badRequest(request);
                    return;
                }
                else {
                    try {
                        size = Integer.parseInt(resultSize);
                    } catch (NumberFormatException e) {
                        badRequest(request, "actualites.widget.bad.request.size.must.be.an.integer");
                        return;
                    }
                    if(size <=0 || size > 20) {
                        badRequest(request, "actualites.widget.bad.request.invalid.size");
                        return;
                    }
                }
                infoService.listLastPublishedInfos(user, size, arrayResponseHandler(request));
            }
        });
    }

	@Post("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info")
	@ApiDoc("Add a new Info with draft status")
	@ResourceFilter(ThreadFilter.class)
	@SecuredAction(value = "thread.contrib", type = ActionType.RESOURCE)
	public void createDraft(final HttpServerRequest request) {
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				RequestUtils.bodyToJson(request, pathPrefix + SCHEMA_INFO_CREATE, new Handler<JsonObject>() {
					@Override
					public void handle(JsonObject resource) {
						resource.putNumber("status", status_list.get(1));
						infoService.create(resource, user, Events.DRAFT.toString(),notEmptyResponseHandler(request));
					}
				});
			}
		});
	}

    @Post("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/pending")
    @ApiDoc("Add a new Info with pending status")
    @ResourceFilter(ThreadFilter.class)
    @SecuredAction(value = "thread.contrib", type = ActionType.RESOURCE)
    public void createPending(final HttpServerRequest request) {
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                RequestUtils.bodyToJson(request, pathPrefix + SCHEMA_INFO_CREATE, new Handler<JsonObject>() {
                    @Override
                    public void handle(JsonObject resource) {
                        resource.putNumber("status", status_list.get(2));
                        final String threadId = resource.getNumber("thread_id").toString();
                        final String title = resource.getString("title");
                        infoService.create(resource, user, Events.CREATE_AND_PENDING.toString(),
                                new Handler<Either<String, JsonObject>>() {
                                    @Override
                                    public void handle(Either<String, JsonObject> event) {
                                        if (event.isRight()) {
                                            JsonObject info = event.right().getValue();
                                            String infoId = info.getNumber("id").toString();
                                            notifyTimeline(request, user, threadId, infoId, title, NEWS_SUBMIT_EVENT_TYPE);
                                            renderJson(request, event.right().getValue(), 200);
                                        } else {
                                            JsonObject error = new JsonObject().putString("error", event.left().getValue());
                                            renderJson(request, error, 400);
                                        }
                                    }
                                }
                        );
                    }
                });
            }
        });
    }

	@Post("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/published")
	@ApiDoc("Add a new Info published status")
	@ResourceFilter(ThreadFilter.class)
	@SecuredAction(value = "thread.publish", type = ActionType.RESOURCE)
	public void createPublished(final HttpServerRequest request) {
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				RequestUtils.bodyToJson(request, pathPrefix + SCHEMA_INFO_CREATE, new Handler<JsonObject>() {
					@Override
					public void handle(JsonObject resource) {
						resource.putNumber("status", status_list.get(3));
						infoService.create(resource, user, Events.CREATE_AND_PUBLISH.toString(),notEmptyResponseHandler(request));
					}
				});
			}
		});
	}

    @Put("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/:"+Actualites.INFO_RESOURCE_ID+"/draft")
    @ApiDoc("Update : update an Info in Draft state in thread by thread and by id")
    @ResourceFilter(InfoFilter.class)
    @SecuredAction(value = "thread.contrib", type = ActionType.RESOURCE)
    public void updateDraft(final HttpServerRequest request) {
        final String infoId = request.params().get(Actualites.INFO_RESOURCE_ID);
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                RequestUtils.bodyToJson(request, pathPrefix + SCHEMA_INFO_UPDATE, new Handler<JsonObject>() {
                    @Override
                    public void handle(JsonObject resource) {
                        resource.putNumber("status", status_list.get(1));
                        if(!resource.containsField("expiration_date")){
                            resource.putString("expiration_date", null);
                        }
                        if(!resource.containsField("publication_date")){
                            resource.putString("publication_date", null);
                        }
                        notifyOwner(request, user, resource, infoId, NEWS_UPDATE_EVENT_TYPE);
                        infoService.update(infoId, resource, user, Events.UPDATE.toString(), notEmptyResponseHandler(request));
                    }
                });
            }
        });
    }

    @Put("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/:"+Actualites.INFO_RESOURCE_ID+"/pending")
    @ApiDoc("Update : update an Info in Draft state in thread by thread and by id")
    @ResourceFilter(InfoFilter.class)
    @SecuredAction(value = "thread.publish", type = ActionType.RESOURCE)
    public void updatePending(final HttpServerRequest request) {
        final String infoId = request.params().get(Actualites.INFO_RESOURCE_ID);
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                RequestUtils.bodyToJson(request, pathPrefix + SCHEMA_INFO_UPDATE, new Handler<JsonObject>() {
                    @Override
                    public void handle(JsonObject resource) {
                        resource.putNumber("status", status_list.get(2));
                        if(!resource.containsField("expiration_date")){
                            resource.putString("expiration_date", null);
                        }
                        if(!resource.containsField("publication_date")){
                            resource.putString("publication_date", null);
                        }
                        notifyOwner(request, user, resource, infoId, NEWS_UPDATE_EVENT_TYPE);
                        infoService.update(infoId, resource, user, Events.PENDING.toString(), notEmptyResponseHandler(request));
                    }
                });
            }
        });
    }

    @Put("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/:"+Actualites.INFO_RESOURCE_ID+"/published")
    @ApiDoc("Update : update an Info in Draft state in thread by thread and by id")
    @ResourceFilter(InfoFilter.class)
    @SecuredAction(value = "thread.publish", type = ActionType.RESOURCE)
    public void updatePublished(final HttpServerRequest request) {
        final String infoId = request.params().get(Actualites.INFO_RESOURCE_ID);
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                RequestUtils.bodyToJson(request, pathPrefix + SCHEMA_INFO_UPDATE, new Handler<JsonObject>() {
                    @Override
                    public void handle(JsonObject resource) {
                        resource.putNumber("status", status_list.get(3));
                        if(!resource.containsField("expiration_date")){
                            resource.putString("expiration_date", null);
                        }
                        if(!resource.containsField("publication_date")){
                            resource.putString("publication_date", null);
                        }
                        notifyOwner(request, user, resource, infoId, NEWS_UPDATE_EVENT_TYPE);
                        infoService.update(infoId, resource, user, Events.UPDATE.toString(),
                                notEmptyResponseHandler(request));
                    }
                });
            }
        });
    }

    @Override
    @Delete("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/:"+Actualites.INFO_RESOURCE_ID)
    @ApiDoc("Delete : Real delete an Info in thread by thread and by id")
    @ResourceFilter(InfoFilter.class)
    @SecuredAction(value = "thread.manager", type = ActionType.RESOURCE)
    public void delete(final HttpServerRequest request) {
        final String infoId = request.params().get(Actualites.INFO_RESOURCE_ID);
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                crudService.delete(infoId, user, notEmptyResponseHandler(request));
            }
        });
    }

	@Put("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/:"+Actualites.INFO_RESOURCE_ID+"/submit")
	@ApiDoc("Submit : Change an Info to Pending state in thread by thread and by id")
	@ResourceFilter(InfoFilter.class)
	@SecuredAction(value = "thread.contrib", type = ActionType.RESOURCE)
	public void submit(final HttpServerRequest request) {
		final String threadId = request.params().get(Actualites.THREAD_RESOURCE_ID);
		final String infoId = request.params().get(Actualites.INFO_RESOURCE_ID);
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				RequestUtils.bodyToJson(request, new Handler<JsonObject>() {
					@Override
					public void handle(JsonObject body) {
						final String title = body.getString("title");
						Handler<Either<String, JsonObject>> handler = new Handler<Either<String, JsonObject>>() {
							@Override
							public void handle(Either<String, JsonObject> event) {
								if (event.isRight()) {
									notifyTimeline(request, user, threadId, infoId, title, NEWS_SUBMIT_EVENT_TYPE);
									renderJson(request, event.right().getValue(), 200);
								} else {
									JsonObject error = new JsonObject().putString("error", event.left().getValue());
									renderJson(request, error, 400);
								}
							}
						};
						JsonObject resource = new JsonObject();
						resource.putNumber("status", status_list.get(2));
						infoService.update(infoId, resource, user, Events.SUBMIT.toString(),
                                notEmptyResponseHandler(request));
					}
				});
			}
		});
	}

	@Put("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/:"+Actualites.INFO_RESOURCE_ID+"/unsubmit")
	@ApiDoc("Cancel Submit : Change an Info to Draft state in thread by thread and by id")
	@ResourceFilter(InfoFilter.class)
	@SecuredAction(value = "thread.contrib", type = ActionType.RESOURCE)
	public void unsubmit(final HttpServerRequest request) {
		final String threadId = request.params().get(Actualites.THREAD_RESOURCE_ID);
		final String infoId = request.params().get(Actualites.INFO_RESOURCE_ID);
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				RequestUtils.bodyToJson(request, new Handler<JsonObject>() {
					@Override
					public void handle(JsonObject body) {
						final String title = body.getString("title");
						Handler<Either<String, JsonObject>> handler = new Handler<Either<String, JsonObject>>() {
							@Override
							public void handle(Either<String, JsonObject> event) {
								if (event.isRight()) {
									// notifyTimeline(request, user, threadId, infoId, title, NEWS_UNSUBMIT_EVENT_TYPE);
									renderJson(request, event.right().getValue(), 200);
								} else {
									JsonObject error = new JsonObject().putString("error", event.left().getValue());
									renderJson(request, error, 400);
								}
							}
						};
						JsonObject resource = new JsonObject();
						resource.putNumber("status", status_list.get(1));
						infoService.update(infoId, resource, user, Events.UNPUBLISH.toString(),
                                notEmptyResponseHandler(request));
					}
				});
			}
		});
	}

	@Put("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/:"+Actualites.INFO_RESOURCE_ID+"/publish")
	@ApiDoc("Publish : Change an Info to Published state in thread by thread and by id")
	@ResourceFilter(InfoFilter.class)
	@SecuredAction(value = "thread.publish", type = ActionType.RESOURCE)
	public void publish(final HttpServerRequest request) {
		final String threadId = request.params().get(Actualites.THREAD_RESOURCE_ID);
		final String infoId = request.params().get(Actualites.INFO_RESOURCE_ID);
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				RequestUtils.bodyToJson(request, new Handler<JsonObject>() {
					@Override
					public void handle(JsonObject body) {
						final String title = body.getString("title");
						final UserInfos owner = new UserInfos();
						owner.setUserId(body.getString("owner"));
						owner.setUsername(body.getString("username"));
						Handler<Either<String, JsonObject>> handler = new Handler<Either<String, JsonObject>>() {
							@Override
							public void handle(Either<String, JsonObject> event) {
								if (event.isRight()) {
									notifyTimeline(request, user, owner, threadId, infoId, title, NEWS_PUBLISH_EVENT_TYPE);
									renderJson(request, event.right().getValue(), 200);
								} else {
									JsonObject error = new JsonObject().putString("error", event.left().getValue());
									renderJson(request, error, 400);
								}
							}
						};
						JsonObject resource = new JsonObject();
						resource.putNumber("status", status_list.get(3));
						infoService.update(infoId, resource, user, Events.PUBLISH.toString(), notEmptyResponseHandler(request));
					}
				});
			}
		});
	}

	@Put("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/:"+Actualites.INFO_RESOURCE_ID+"/unpublish")
	@ApiDoc("Unpublish : Change an Info to Draft state in thread by thread and by id")
	@ResourceFilter(InfoFilter.class)
	@SecuredAction(value = "thread.publish", type = ActionType.RESOURCE)
	public void unpublish(final HttpServerRequest request) {
		final String threadId = request.params().get(Actualites.THREAD_RESOURCE_ID);
		final String infoId = request.params().get(Actualites.INFO_RESOURCE_ID);
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				RequestUtils.bodyToJson(request, new Handler<JsonObject>() {
					@Override
					public void handle(JsonObject body) {
						final String title = body.getString("title");
						final UserInfos owner = new UserInfos();
						owner.setUserId(body.getString("owner"));
						owner.setUsername(body.getString("username"));
						Handler<Either<String, JsonObject>> handler = new Handler<Either<String, JsonObject>>() {
							@Override
							public void handle(Either<String, JsonObject> event) {
								if (event.isRight()) {
									notifyTimeline(request, user, owner, threadId, infoId, title, NEWS_UNPUBLISH_EVENT_TYPE);
									renderJson(request, event.right().getValue(), 200);
								} else {
									JsonObject error = new JsonObject().putString("error", event.left().getValue());
									renderJson(request, error, 400);
								}
							}
						};
						JsonObject resource = new JsonObject();
						resource.putNumber("status", status_list.get(2));
						infoService.update(infoId, resource, user, Events.UNPUBLISH.toString(), notEmptyResponseHandler(request));
			}
		});
	}
});

	}

    @Get("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/share/json/:"+INFO_ID_PARAMETER)
    @ApiDoc("Get shared info by id.")
    @ResourceFilter(InfoFilter.class)
    @SecuredAction(value = "thread.contrib", type = ActionType.RESOURCE)
    public void shareInfo(final HttpServerRequest request) {
        final String id = request.params().get(INFO_ID_PARAMETER);
        if (id == null || id.trim().isEmpty()) {
            badRequest(request);
            return;
        }
        getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    shareService.shareInfos(user.getUserId(), id, I18n.acceptLanguage(request), request.params().get("search"), new Handler<Either<String, JsonObject>>() {
                        @Override
                        public void handle(Either<String, JsonObject> event) {
                            final Handler<Either<String, JsonObject>> handler = defaultResponseHandler(request);
                            if(event.isRight()){
                                JsonObject result = event.right().getValue();
                                if(result.containsField("actions")){
                                    JsonArray actions = result.getArray("actions");
                                    JsonArray newActions = new JsonArray();
                                    for(Object action : actions){
                                        if(((JsonObject) action).containsField("displayName")){
                                            String displayName = ((JsonObject) action).getString("displayName");
                                            if(displayName.contains(".")){
                                                String resource = displayName.split("\\.")[0];
                                                if(resource.equals(RESOURCE_NAME)){
                                                    newActions.add(action);
                                                }
                                            }
                                        }
                                    }
                                    result.putArray("actions", newActions);
                                }
                                handler.handle(new Either.Right<String, JsonObject>(result));
                            } else {
                                handler.handle(new Either.Left<String, JsonObject>("Error finding shared resource."));
                            }
                        }
                    });

                } else {
                    unauthorized(request);
                }
            }
        });
    }

    @Put("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/share/json/:"+INFO_ID_PARAMETER)
    @ApiDoc("Share info by id.")
    @ResourceFilter(InfoFilter.class)
    @SecuredAction(value = "thread.contrib", type = ActionType.RESOURCE)
    public void shareInfoSubmit(final HttpServerRequest request) {
        final String threadId = request.params().get(Actualites.THREAD_RESOURCE_ID);
        final String infoId = request.params().get(INFO_ID_PARAMETER);
        if(threadId == null || threadId.trim().isEmpty()
                || infoId == null || infoId.trim().isEmpty()) {
            badRequest(request);
            return;
        }
        request.pause();
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    infoService.retrieve(infoId, user, new Handler<Either<String, JsonObject>>() {
                        @Override
                        public void handle(Either<String, JsonObject> event) {
                            request.resume();
                            if(event.right() != null){
                                JsonObject info = event.right().getValue();
                                if(info != null && info.containsField("status")){
                                    if(info.getInteger("status") > 2){
                                        JsonObject params = new JsonObject()
                                                .putString("profilUri", "/userbook/annuaire#" + user.getUserId() + "#" + user.getType())
                                                .putString("username", user.getUsername())
                                                .putString("resourceUri", pathPrefix + "#/view/thread/" + threadId + "/info/" + infoId)
                                                .putBoolean("disableAntiFlood", true);
                                        DateFormat dfm = new SimpleDateFormat("yyyy-MM-dd");
                                        String date = info.getString("publication_date");
                                        if(date != null && !date.trim().isEmpty()){
                                            try {
                                                Date publication_date = dfm.parse(date);
                                                Date timeNow=new Date(System.currentTimeMillis());
                                                if(publication_date.after(timeNow)){
                                                    params.putNumber("timeline-publish-date", publication_date.getTime());
                                                }
                                            } catch (ParseException e) {
                                                log.error("An error occured when sharing an info : " + e.getMessage());
                                            }
                                        }
                                        shareJsonSubmit(request, "news.info-shared", false, params, "title");
                                    } else {
                                        shareJsonSubmit(request, null, false, null, null);
                                    }
                                }
                            }
                        }
                    });
                } else {
                    unauthorized(request);
                }
            }
        });
    }

    @Put("/thread/:"+Actualites.THREAD_RESOURCE_ID+"/info/share/remove/:"+INFO_ID_PARAMETER)
    @ApiDoc("Remove Share by id.")
    @ResourceFilter(InfoFilter.class)
    @SecuredAction(value = "thread.contrib", type = ActionType.RESOURCE)
    public void shareInfoRemove(final HttpServerRequest request) {
        removeShare(request, false);
    }

    private void notifyOwner(final HttpServerRequest request, final UserInfos user, final JsonObject resource, final String infoId, final String eventType) {
        infoService.getOwnerInfo(infoId, new Handler<Either<String, JsonObject>>() {
            @Override
            public void handle(Either<String, JsonObject> event) {
                if (event.isRight()) {
                    String ownerId = event.right().getValue().getString("owner");
                    if (!ownerId.equals(user.getUserId()) && resource.containsField("thread_id") && resource.containsField("title")) {
                        UserInfos owner = new UserInfos();
                        owner.setUserId(ownerId);
                        notifyTimeline(request,  user, owner, resource.getNumber("thread_id").toString(), infoId, resource.getString("title"), eventType);
                    }
                } else {
                    log.error("Unable to create notification : GetOwnerInfo failed");
                }
            }
        });
//            notifyTimeline(request, user, resource.getString("thread_id"), infoId, resource.getString("title"), NEWS_UPDATE_EVENT_TYPE);
    }

    private void notifyTimeline(final HttpServerRequest request, final UserInfos user, final String threadId, final String infoId, final String title, final String eventType){
        // the news owner is behind the action
        UserInfos owner = user;
        notifyTimeline(request, user, owner, threadId, infoId, title, eventType);
    }

    private void notifyTimeline(final HttpServerRequest request, final UserInfos user, final UserInfos owner, final String threadId, final String infoId, final String title, final String eventType){
        if (eventType.equals(NEWS_SUBMIT_EVENT_TYPE)) {
            threadService.getPublishSharedWithIds(threadId, new Handler<Either<String, JsonArray>>() {
                @Override
                public void handle(Either<String, JsonArray> event) {
                    if (event.isRight()) {
                        // get all ids
                        JsonArray shared = event.right().getValue();
                        extractUserIds(request, shared, user, owner, threadId, infoId, title, "news.news-submitted");
                    }
                }
            });
        } else if(eventType.equals(NEWS_UNSUBMIT_EVENT_TYPE)){
            threadService.getPublishSharedWithIds(threadId, new Handler<Either<String, JsonArray>>() {
                @Override
                public void handle(Either<String, JsonArray> event) {
                    if (event.isRight()) {
                        // get all ids
                        JsonArray shared = event.right().getValue();
                        extractUserIds(request, shared, user, owner, threadId, infoId, title, "news.news-unsubmitted");
                    }
                }
            });
        } else if(eventType.equals(NEWS_PUBLISH_EVENT_TYPE)){
            infoService.getSharedWithIds(infoId, new Handler<Either<String, JsonArray>>() {
                @Override
                public void handle(Either<String, JsonArray> event) {
                    if (event.isRight()) {
                        // get all ids
                        JsonArray shared = event.right().getValue();
                        extractUserIds(request, shared, user, owner, threadId, infoId, title, "news.news-published");
                    }
                }
            });
        } else if(eventType.equals(NEWS_UNPUBLISH_EVENT_TYPE)){
            infoService.getSharedWithIds(infoId, new Handler<Either<String, JsonArray>>() {
                @Override
                public void handle(Either<String, JsonArray> event) {
                    if (event.isRight()) {
                        // get all ids
                        JsonArray shared = event.right().getValue();
                        extractUserIds(request, shared, user, owner, threadId, infoId, title, "news.news-unpublished");
                    }
                }
            });
        } else if (eventType.equals(NEWS_UPDATE_EVENT_TYPE)) {
            ArrayList<String> ids = new ArrayList<>();
            ids.add(owner.getUserId());
            sendNotify(request, ids, user, threadId, infoId, title, "news.news-update");
        }
    }

    private void extractUserIds(final HttpServerRequest request, final JsonArray shared, final UserInfos user, final UserInfos owner, final String threadId, final String infoId, final String title, final String notificationName){
        final List<String> ids = new ArrayList<String>();
        if (shared.size() > 0) {
            JsonObject jo = null;
            String groupId = null;
            String id = null;
            final AtomicInteger remaining = new AtomicInteger(shared.size());
            // Extract shared with
            for(int i=0; i<shared.size(); i++){
                jo = (JsonObject) shared.get(i);
                if(jo.containsField("userId")){
                    id = jo.getString("userId");
                    if(!ids.contains(id) && !(user.getUserId().equals(id)) && !(owner.getUserId().equals(id))){
                        ids.add(id);
                    }
                    remaining.getAndDecrement();
                }
                else{
                    if(jo.containsField("groupId")){
                        groupId = jo.getString("groupId");
                        if (groupId != null) {
                            UserUtils.findUsersInProfilsGroups(groupId, eb, user.getUserId(), false, new Handler<JsonArray>() {
                                @Override
                                public void handle(JsonArray event) {
                                    if (event != null) {
                                        String userId = null;
                                        for (Object o : event) {
                                            if (!(o instanceof JsonObject)) continue;
                                            userId = ((JsonObject) o).getString("id");
                                            if(!ids.contains(userId) && !(user.getUserId().equals(userId)) && !(owner.getUserId().equals(userId))){
                                                ids.add(userId);
                                            }
                                        }
                                    }
                                    if (remaining.decrementAndGet() < 1) {
                                        sendNotify(request, ids, owner, threadId, infoId, title, notificationName);
                                    }
                                }
                            });
                        }
                    }
                }
            }
            if (remaining.get() < 1) {
                sendNotify(request, ids, owner, threadId, infoId, title, notificationName);
            }
        }
    }

    private void sendNotify(final HttpServerRequest request, final List<String> ids, final UserInfos owner, final String threadId, final String infoId, final String title, final String notificationName){
        if (infoId != null && !infoId.isEmpty() && threadId != null && !threadId.isEmpty() && owner != null) {
            JsonObject params = new JsonObject()
                    .putString("profilUri", "/userbook/annuaire#" + owner.getUserId() + "#" + (owner.getType() != null ? owner.getType() : ""))
                    .putString("username", owner.getUsername())
                    .putString("info", title)
                    .putString("actuUri", pathPrefix + "#/view/thread/" + threadId + "/info/" + infoId);
            params.putString("resourceUri", params.getString("actuUri"));
            notification.notifyTimeline(request, notificationName, owner, ids, infoId, params);
        }
    }

    @Get("/info/:"+ Actualites.INFO_RESOURCE_ID +"/timeline")
    @ApiDoc("Get info timeline by id")
    @ResourceFilter(InfoFilter.class)
    @SecuredAction(value = "thread.publish", type = ActionType.RESOURCE)
    public void getInfoTimeline (final HttpServerRequest request) {
        final String id = request.params().get(Actualites.INFO_RESOURCE_ID);
        if (id == null || id.trim().isEmpty()) {
            badRequest(request);
            return;
        }
        try {
            infoService.getRevisions(Long.parseLong(id), arrayResponseHandler(request));
        } catch (NumberFormatException e) {
            log.error("Error : id info must be a long object");
            badRequest(request);
        }
    }

}
