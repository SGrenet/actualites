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

package net.atos.entng.actualites.services.impl;

import static net.atos.entng.actualites.Actualites.MANAGE_RIGHT_ACTION;

import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.sql.SqlStatementsBuilder;
import org.entcore.common.user.RepositoryEvents;
import org.vertx.java.core.Handler;
import org.vertx.java.core.json.JsonArray;
import org.vertx.java.core.json.JsonObject;
import org.vertx.java.core.logging.Logger;
import org.vertx.java.core.logging.impl.LoggerFactory;

import fr.wseduc.webutils.Either;

public class ActualitesRepositoryEvents implements RepositoryEvents {

	private static final Logger log = LoggerFactory.getLogger(ActualitesRepositoryEvents.class);
	private final boolean shareOldGroupsToUsers;

	public ActualitesRepositoryEvents(boolean shareOldGroupsToUsers) {
		this.shareOldGroupsToUsers = shareOldGroupsToUsers;
	}

	@Override
	public void exportResources(String exportId, String userId, JsonArray groups, String exportPath, String locale, String host, final Handler<Boolean> handler) {
		// TODO Implement exportResources
		log.warn("[ActualitesRepositoryEvents] exportResources is not implemented");
	}

	@Override
	public void deleteGroups(JsonArray groups) {
		if(groups != null && groups.size() > 0) {
			final JsonArray gIds = new JsonArray();
			for (Object o : groups) {
				if (!(o instanceof JsonObject)) continue;
				final JsonObject j = (JsonObject) o;
				gIds.add(j.getString("group"));
			}
            if (gIds.size() > 0) {
                // Delete the groups. Cascade delete : delete from members, thread_shares and info_shares too
                Sql.getInstance().prepared("DELETE FROM actualites.groups WHERE id IN " + Sql.listPrepared(gIds.toArray())
                        , gIds, SqlResult.validRowsResultHandler(new Handler<Either<String, JsonObject>>() {
                    @Override
                    public void handle(Either<String, JsonObject> event) {
                        if (event.isRight()) {
                            log.info("[ActualitesRepositoryEvents][deleteGroups]The groups and their shares are deleted");
                        } else {
                            log.error("[ActualitesRepositoryEvents][deleteGroups] Error deleting the groups and their shares. Message : " + event.left().getValue());
                        }
                    }
                }));
            }
		} else {
			log.warn("[ActualitesRepositoryEvents][deleteGroups] groups is null or empty");
		}
	}

	@Override
	public void deleteUsers(JsonArray users) {
        //FIXME: anonymization is not relevant
		if (users != null && users.size() > 0) {
			final JsonArray uIds = new JsonArray();
			for (Object u : users) {
				if (!(u instanceof JsonObject)) continue;
				final JsonObject j = (JsonObject) u;
				uIds.add(j.getString("id"));
			}
			SqlStatementsBuilder statementsBuilder = new SqlStatementsBuilder();
			// Remove all thread shares from thread_shares table
			statementsBuilder.prepared("DELETE FROM actualites.thread_shares WHERE member_id IN " + Sql.listPrepared(uIds.toArray()), uIds);
			// Remove all news shares from info_shares table
			statementsBuilder.prepared("DELETE FROM actualites.info_shares WHERE member_id IN " + Sql.listPrepared(uIds.toArray()), uIds);
			// Delete users (Set deleted = true in users table)
			statementsBuilder.prepared("UPDATE actualites.users SET deleted = true WHERE id IN " + Sql.listPrepared(uIds.toArray()), uIds);
			// Delete all threads where the owner is deleted and no manager rights shared on these resources
			// Cascade delete : the news that belong to these threads will be deleted too
			// thus, no need to delete news that do not have a manager because the thread owner is still there
			statementsBuilder.prepared("DELETE FROM actualites.thread" +
									  " USING (" +
										  " SELECT DISTINCT t.id, count(ts.member_id) AS managers" +
										  " FROM actualites.thread AS t" +
										  " LEFT OUTER JOIN actualites.thread_shares AS ts ON t.id = ts.resource_id AND ts.action = ?" +
										  " LEFT OUTER JOIN actualites.users AS u ON t.owner = u.id" +
										  " WHERE u.deleted = true" +
										  " GROUP BY t.id" +
									 " ) a" +
									 " WHERE actualites.thread.id = a.id" +
									 " AND a.managers = 0"
								  	  , new JsonArray().add(MANAGE_RIGHT_ACTION));
			Sql.getInstance().transaction(statementsBuilder.build(), SqlResult.validRowsResultHandler(new Handler<Either<String, JsonObject>>() {
				@Override
				public void handle(Either<String, JsonObject> event) {
					if (event.isRight()) {
						log.info("[ActualitesRepositoryEvents][cleanDataBase] The resources created by users are deleted");
                    } else {
						log.error("[ActualitesRepositoryEvents][cleanDataBase] Error deleting the resources created by users. Message : " + event.left().getValue());
					}
				}
			}));
		} else {
			log.warn("[ActualitesRepositoryEvents][deleteUsers] users is empty");
		}
	}
}
